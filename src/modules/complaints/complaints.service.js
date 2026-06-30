import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import {
  COMPLAINT_PUBLIC_VISIBILITY,
  isComplaintPubliclyVisible,
} from "../../shared/types/complaint.visibility.js";
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
import * as mapTilesService from "../map-tiles/map-tiles.service.js";
import { publishMapTileInvalidation } from "../map-tiles/map-tiles.realtime.js";
import {
  getChangedComplaintTileKeys,
  getComplaintTileKeys,
  getMapTileBounds,
} from "../map-tiles/map-tiles.util.js";
import logger from "../../logger/index.js";

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

const isVisibleComplaint = isComplaintPubliclyVisible;

const getTileBounds = ({ z, x, y, limit }) => {
  return {
    ...getMapTileBounds({ z, x, y }),
    limit,
  };
};

const syncAndPublishMapTiles = async ({
  previousComplaint,
  nextComplaint,
  complaintId,
  action,
}) => {
  await mapTilesService.syncComplaintTileStats({
    previousComplaint,
    nextComplaint,
  });

  const tileKeys =
    previousComplaint && nextComplaint
      ? getChangedComplaintTileKeys(previousComplaint, nextComplaint)
      : getComplaintTileKeys(nextComplaint || previousComplaint);

  publishMapTileInvalidation({
    tileKeys,
    complaintId,
    action,
  });

  logger.info(
    {
      event: "complaints.map_tiles.synced",
      complaintId,
      action,
      tileCount: tileKeys.length,
      status: nextComplaint?.status ?? previousComplaint?.status ?? null,
    },
    "Tiles do mapa sincronizados para denúncia",
  );
};

export const create = async (complaintData, authenticatedUserId) => {
  const complaintId = complaintRepository.createId();

  const complaint = {
    ...complaintData,
    createdById: authenticatedUserId,
    status: COMPLAINT_STATUS.OPEN,
    publicVisibility: COMPLAINT_PUBLIC_VISIBILITY.VISIBLE,
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

  await syncAndPublishMapTiles({
    previousComplaint: null,
    nextComplaint: complaint,
    complaintId,
    action: "created",
  });

  logger.info(
    {
      event: "complaints.created",
      complaintId,
      actorUserId: authenticatedUserId,
      status: complaint.status,
    },
    "Denúncia criada",
  );

  return {
    ...complaint,
    id: complaintId,
  };
};

export const getAll = async ({ limit, cursor }) => {
  return await complaintRepository.getSummaryPage({ limit, cursor });
};

export const getAdminAll = async ({ limit, cursor }) => {
  const complaints = await complaintRepository.getAdminSummaryPage({ limit, cursor });
  return {
    ...complaints,
    items: await usersService.enrichWithCreatedByUsernames(complaints.items),
  };
};

export const getDetail = async (id) => {
  const currentComplaint = await complaintRepository.getDetail(id);
  if (currentComplaint.publicVisibility !== COMPLAINT_PUBLIC_VISIBILITY.VISIBLE) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  const complaint = await openValidationByOwnerInactivityIfNeeded(id);
  if (complaint.publicVisibility !== COMPLAINT_PUBLIC_VISIBILITY.VISIBLE) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }
  return await usersService.enrichWithCreatedByUsername(complaint);
};

export const getAdminDetail = async (id) => {
  const complaint = await complaintRepository.getDetail(id);
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

  await syncAndPublishMapTiles({
    previousComplaint: complaint,
    nextComplaint: updated,
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
  logger.info(
    {
      event: "complaints.updated",
      complaintId: id,
      actorUserId: authenticatedUserId,
      status: updated.status,
    },
    "Denúncia atualizada",
  );
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

  await syncAndPublishMapTiles({
    previousComplaint: complaint,
    nextComplaint: updated,
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

  logger.info(
    {
      event: "complaints.status_updated",
      complaintId,
      actorUserId: authenticatedUserId,
      previousStatus: currentStatus,
      nextStatus: newStatus,
    },
    "Status da denúncia atualizado",
  );

  return await usersService.enrichWithCreatedByUsername(updated);
};

export const deleteComplaint = async (id, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(id);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o criador pode excluir esta denuncia");
  }

  await deleteFiles(complaint.photos);

  await complaintRepository.deleteComplaint(id);
  await syncAndPublishMapTiles({
    previousComplaint: complaint,
    nextComplaint: null,
    complaintId: id,
    action: "deleted",
  });

  await notificationsService.clearByComplaintId(id);

  logger.info(
    {
      event: "complaints.deleted",
      complaintId: id,
      actorUserId: authenticatedUserId,
      previousStatus: complaint.status,
    },
    "Denúncia excluída",
  );

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

export const findWithinTiles = async ({ tiles, limit }) => {
  return await Promise.all(
    tiles.map(async (tile) => {
      const complaints = await complaintRepository.findWithinBounds({
        ...getTileBounds(tile),
        limit,
      });

      return {
        tileKey: `${tile.z}:${tile.x}:${tile.y}`,
        tile,
        items: await usersService.enrichWithCreatedByUsernames(complaints),
      };
    }),
  );
};

export const getMapTilesIndex = async (query) => {
  return await mapTilesService.getTilesIndex(query);
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

    logger.info(
      {
        event: "complaints.validation.auto_opened",
        complaintId,
        reasonType: OWNER_INACTIVE_REASON_TYPE,
      },
      "Validação aberta por inatividade do autor",
    );
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

  await syncAndPublishMapTiles({
    previousComplaint: complaint,
    nextComplaint: updated,
    complaintId,
    action: "validation_requested",
  });

  await notifyValidationRequestRecipients({
    complaint,
    complaintId,
    actorUserId: authenticatedUserId,
  });

  logger.info(
    {
      event: "complaints.validation.requested",
      complaintId,
      actorUserId: authenticatedUserId,
      reasonType,
      evidenceCount: evidenceIds?.length ?? 0,
    },
    "Validação de denúncia solicitada",
  );

  return await usersService.enrichWithCreatedByUsername(updated);
};

export const getFollowedByUsername = async (username) => {
  const userId = await usersService.getUidByUsername(username);

  if (!userId) {
    throw new NotFoundError();
  }

  const complaintIds = await complaintFollowersRepository.getComplaintIdsByUserId(userId);

  if (complaintIds.length === 0) return [];

  const complaints = await complaintRepository.getByIds(complaintIds);
  return complaints.filter(isVisibleComplaint);
};

export const getFollowedSummaryByUsername = async (username) => {
  const userId = await usersService.getUidByUsername(username);

  if (!userId) {
    throw new NotFoundError();
  }

  const complaintIds = await complaintFollowersRepository.getComplaintIdsByUserId(userId);
  const complaints = await complaintRepository.getByIds(complaintIds);
  const visibleComplaints = complaints.filter(isVisibleComplaint);

  return {
    total: visibleComplaints.length,
    resolved: visibleComplaints.filter(
      (complaint) => complaint.status === COMPLAINT_STATUS.RESOLVED,
    ).length,
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

  await syncAndPublishMapTiles({
    previousComplaint: complaint,
    nextComplaint: updated,
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

  logger.info(
    {
      event: "complaints.resolved",
      complaintId,
      actorUserId: authenticatedUserId,
      validationCount: count,
    },
    "Denúncia marcada como resolvida",
  );

  return await usersService.enrichWithCreatedByUsername(updated);
};
