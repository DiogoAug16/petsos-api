import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { deleteFiles } from "../../shared/helpers/file.helper.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as usersService from "../users/users.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import * as complaintValidationsRepository from "../complaint-validations/complaint-validations.repository.js";
import * as complaintVolunteersRepository from "../complaint-volunteers/complaint-volunteers.repository.js";
import { publishMapTileInvalidation } from "../map-tiles/map-tiles.realtime.js";
import {
  getChangedComplaintTileKeys,
  getComplaintTileKeys,
} from "../map-tiles/map-tiles.util.js";

const VALID_TRANSITIONS = {
  [COMPLAINT_STATUS.OPEN]: [COMPLAINT_STATUS.IN_PROGRESS],
  [COMPLAINT_STATUS.IN_PROGRESS]: [COMPLAINT_STATUS.AWAITING_VALIDATION],
  [COMPLAINT_STATUS.AWAITING_VALIDATION]: [COMPLAINT_STATUS.RESOLVED],
  [COMPLAINT_STATUS.RESOLVED]: [],
  [COMPLAINT_STATUS.CLOSED]: [],
};
const VALIDATION_REQUEST_ALLOWED_STATUS = [
  COMPLAINT_STATUS.OPEN,
  COMPLAINT_STATUS.IN_PROGRESS,
  COMPLAINT_STATUS.AWAITING_VALIDATION,
];
const OWNER_RESPONSE_DAYS = 7;
const OWNER_INACTIVE_REASON_TYPE = "owner_inactive";

const tileYToLatitude = (y, zoom) => {
  const radians = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** zoom)));
  return (radians * 180) / Math.PI;
};

const getTileBounds = ({ z, x, y, limit }) => {
  const tiles = 2 ** z;
  return {
    north: tileYToLatitude(y, z),
    south: tileYToLatitude(y + 1, z),
    west: (x / tiles) * 360 - 180,
    east: ((x + 1) / tiles) * 360 - 180,
    limit,
  };
};

export const create = async (complaintData, authenticatedUserId) => {
  const complaintId = complaintRepository.createId();

  const complaint = {
    ...complaintData,
    createdById: authenticatedUserId,
    status: COMPLAINT_STATUS.OPEN,
    followersCount: 1,
    volunteersCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await Promise.all([
    complaintRepository.create(complaint, complaintId),
    complaintFollowersRepository.createInitialFollower(
      complaintId,
      authenticatedUserId,
      complaint.createdAt,
    ),
  ]);

  publishMapTileInvalidation({
    tileKeys: getComplaintTileKeys(complaint),
    complaintId,
    action: "created",
  });

  return {
    ...complaint,
    id: complaintId,
  };
};

export const getAll = async ({ limit, cursor }) => {
  const page = await complaintRepository.getPage({ limit, cursor });
  return {
    ...page,
    items: await usersService.enrichWithCreatedByUsernames(page.items),
  };
};

export const getDetail = async (id) => {
  const complaint = await openValidationByOwnerInactivityIfNeeded(id);
  return await usersService.enrichWithCreatedByUsername(complaint);
};

export const patch = async (id, body, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(id);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o criador pode editar esta denuncia");
  }

  const updatedData = {
    ...body,
    updatedAt: new Date(),
  };

  const updated = await complaintRepository.patch(id, updatedData);

  publishMapTileInvalidation({
    tileKeys: getChangedComplaintTileKeys(complaint, updated),
    complaintId: id,
    action: "updated",
  });

  await notificationsService.notifyComplaintFollowers({
    complaintId: id,
    actorUserId: authenticatedUserId,
    type: "complaint_update",
    message: "Uma denúncia que você acompanha foi atualizada.",
    sendPush: true,
  });
  return await usersService.enrichWithCreatedByUsername(updated);
};

export const updateStatus = async (complaintId, newStatus, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o criador pode alterar o status desta denúncia");
  }

  const currentStatus = complaint.status;
  const allowedTransitions = VALID_TRANSITIONS[currentStatus] || [];

  if (!allowedTransitions.includes(newStatus)) {
    throw new ValidationError(
      `Transição de status inválida: "${currentStatus}" → "${newStatus}". Transições permitidas: ${allowedTransitions.join(", ") || "nenhuma"}`,
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  const updated = await complaintRepository.setStatus(complaintId, newStatus);

  publishMapTileInvalidation({
    tileKeys: getComplaintTileKeys(updated),
    complaintId,
    action: "status_updated",
  });

  await notificationsService.notifyComplaintFollowers({
    complaintId,
    actorUserId: authenticatedUserId,
    type: "status_change",
    message: `O status da denúncia "${complaint.title}" foi alterado para "${newStatus}".`,
    sendPush: false,
  });

  return await usersService.enrichWithCreatedByUsername(updated);
};

export const deleteComplaint = async (id, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(id);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o criador pode excluir esta denuncia");
  }

  await deleteFiles(complaint.photos);

  await complaintRepository.deleteComplaint(id);
  publishMapTileInvalidation({
    tileKeys: getComplaintTileKeys(complaint),
    complaintId: id,
    action: "deleted",
  });

  await notificationsService.clearByComplaintId(id);

  return { message: "Denuncia excluida com sucesso" };
};

export const findNearestWithinRadius = async ({ lat, lng, radiusKm }) => {
  const complaints = await complaintRepository.findNearestWithinRadius(
    lat,
    lng,
    radiusKm,
  );
  return await usersService.enrichWithCreatedByUsernames(complaints);
};

export const findWithinBounds = async (bounds) => {
  const complaints = await complaintRepository.findWithinBounds(bounds);
  return await usersService.enrichWithCreatedByUsernames(complaints);
};

export const findWithinTile = async (tile) => {
  const complaints = await complaintRepository.findWithinBounds(getTileBounds(tile));
  return await usersService.enrichWithCreatedByUsernames(complaints);
};

const notifyValidationRequestRecipients = async ({
  complaint,
  complaintId,
  actorUserId,
}) => {
  const [followerIds, volunteerIds] = await Promise.all([
    complaintFollowersRepository.getFollowers(complaintId),
    complaintVolunteersRepository.getVolunteers(complaintId),
  ]);

  const recipientIds = new Set([...followerIds, ...volunteerIds]);
  if (actorUserId) recipientIds.delete(actorUserId);

  return await Promise.all(
    [...recipientIds].map((recipientId) =>
      notificationsService.createNotification({
        userId: recipientId,
        complaintId,
        type: "validation_request",
        message: `A denúncia "${complaint.title}" precisa de validação.`,
        sendPush: true,
      }),
    ),
  );
};

const isOwnerInactive = (complaint) => {
  const statusUpdatedAt = complaint.statusUpdatedAt ?? null;
  if (!statusUpdatedAt) return false;

  const statusUpdatedAtDate = new Date(statusUpdatedAt);
  if (Number.isNaN(statusUpdatedAtDate.getTime())) return false;

  const daysSinceUpdate =
    (Date.now() - statusUpdatedAtDate.getTime()) / (1000 * 60 * 60 * 24);

  return daysSinceUpdate >= OWNER_RESPONSE_DAYS;
};

const openValidationByOwnerInactivityIfNeeded = async (complaintId) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  if (
    complaint.status !== COMPLAINT_STATUS.AWAITING_VALIDATION ||
    complaint.validationRequestedAt ||
    !isOwnerInactive(complaint)
  ) {
    return complaint;
  }

  const result = await complaintRepository.requestValidationIfUnrequested(complaintId, {
    requestedBy: null,
    reasonType: OWNER_INACTIVE_REASON_TYPE,
    reasonText: null,
  });

  if (result.opened) {
    await notifyValidationRequestRecipients({
      complaint: result.complaint,
      complaintId,
      actorUserId: null,
    });
  }

  return result.complaint;
};

export const requestValidation = async (
  complaintId,
  authenticatedUserId,
  { reasonType, reasonText, evidenceIds },
) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  const isVolunteer = await complaintVolunteersRepository.isVolunteer(
    complaintId,
    authenticatedUserId,
  );

  if (!isVolunteer) {
    throw new ForbiddenError(
      "Apenas voluntários vinculados podem abrir votação de validação.",
    );
  }

  if (!VALIDATION_REQUEST_ALLOWED_STATUS.includes(complaint.status)) {
    throw new ValidationError(
      {
        fieldErrors: {
          status: [
            "Apenas denúncias abertas, em andamento ou aguardando validação podem abrir votação.",
          ],
        },
      },
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  if (complaint.validationRequestedAt) {
    throw new ConflictError("Votação de validação já foi aberta para esta denúncia");
  }

  if (reasonType === "evidence_selection") {
    if (!evidenceIds || evidenceIds.length === 0) {
      throw new ValidationError(
        "Selecione ao menos uma evidência para propor à comunidade",
      );
    }
  }

  const updated = await complaintRepository.requestValidation(complaintId, {
    requestedBy: authenticatedUserId,
    reasonType,
    reasonText,
    evidenceIds: reasonType === "evidence_selection" ? evidenceIds : null,
  });

  await notifyValidationRequestRecipients({
    complaint,
    complaintId,
    actorUserId: authenticatedUserId,
  });

  return await usersService.enrichWithCreatedByUsername(updated);
};

export const getFollowedByUsername = async (username) => {
  const userId = await usersService.getUidByUsername(username);

  if (!userId) {
    throw new NotFoundError();
  }

  const complaintIds = await complaintFollowersRepository.getComplaintIdsByUserId(userId);

  if (complaintIds.length === 0) return [];

  return await complaintRepository.getByIds(complaintIds);
};

export const getFollowedSummaryByUsername = async (username) => {
  const userId = await usersService.getUidByUsername(username);

  if (!userId) {
    throw new NotFoundError();
  }

  const complaintIds = await complaintFollowersRepository.getComplaintIdsByUserId(userId);
  const statusSummary = await complaintRepository.getStatusSummaryByIds(complaintIds);

  return {
    total: statusSummary.total,
    resolved: statusSummary.resolved,
  };
};

const MIN_VALIDATIONS_TO_CONFIRM_RESOLUTION = 3;

export const confirmResolution = async (complaintId, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o autor pode confirmar a resolução.");
  }

  if (complaint.status !== COMPLAINT_STATUS.AWAITING_VALIDATION) {
    throw new ValidationError(
      { fieldErrors: {} },
      ERROR_CODES.VALIDATION_ERROR,
      "A denúncia precisa estar aguardando validação.",
    );
  }

  const { count } = await complaintValidationsRepository.countByComplaintId(complaintId);

  if (count < MIN_VALIDATIONS_TO_CONFIRM_RESOLUTION) {
    throw new ValidationError(
      { fieldErrors: {} },
      ERROR_CODES.VALIDATION_ERROR,
      "Validações insuficientes para confirmar resolução.",
    );
  }

  const updated = await complaintRepository.confirmResolution(complaintId);

  publishMapTileInvalidation({
    tileKeys: getComplaintTileKeys(updated),
    complaintId,
    action: "resolved",
  });

  await notificationsService.notifyComplaintFollowers({
    complaintId,
    actorUserId: authenticatedUserId,
    type: "complaint_resolved",
    message: `A denúncia "${complaint.title}" foi marcada como resolvida pelo autor.`,
    sendPush: false,
  });

  return await usersService.enrichWithCreatedByUsername(updated);
};
