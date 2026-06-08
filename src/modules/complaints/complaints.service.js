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

const VALID_TRANSITIONS = {
  [COMPLAINT_STATUS.OPEN]: [COMPLAINT_STATUS.IN_PROGRESS],
  [COMPLAINT_STATUS.IN_PROGRESS]: [COMPLAINT_STATUS.AWAITING_VALIDATION],
  [COMPLAINT_STATUS.AWAITING_VALIDATION]: [COMPLAINT_STATUS.RESOLVED],
  [COMPLAINT_STATUS.RESOLVED]: [],
  [COMPLAINT_STATUS.CLOSED]: [],
};
const VALIDATION_REQUEST_RADIUS_KM = 5;
const VALIDATION_REQUEST_ALLOWED_STATUS = [
  COMPLAINT_STATUS.OPEN,
  COMPLAINT_STATUS.IN_PROGRESS,
  COMPLAINT_STATUS.AWAITING_VALIDATION,
];

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

  return {
    ...complaint,
    id: complaintId,
  };
};

export const getAll = async () => {
  const complaints = await complaintRepository.getAll();
  return await usersService.enrichWithCreatedByUsernames(complaints);
};

export const getDetail = async (id) => {
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

  deleteFiles(complaint.photos);

  await complaintRepository.deleteComplaint(id);
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

const notifyValidationRequestRecipients = async ({
  complaint,
  complaintId,
  actorUserId,
}) => {
  const [followerIds, nearbyUsers] = await Promise.all([
    complaintFollowersRepository.getFollowers(complaintId),
    usersService.findNearestWithinRadius({
      lat: complaint.location.latitude,
      lng: complaint.location.longitude,
      radiusKm: VALIDATION_REQUEST_RADIUS_KM,
    }),
  ]);

  const recipientIds = new Set(followerIds);
  nearbyUsers.forEach((user) => recipientIds.add(user.id));
  recipientIds.delete(actorUserId);

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

export const requestValidation = async (complaintId, authenticatedUserId) => {
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
          status: ["Apenas denúncias abertas ou em andamento podem abrir votação."],
        },
      },
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  if (complaint.validationRequestedAt) {
    throw new ConflictError("Votação de validação já foi aberta para esta denúncia");
  }

  const updated = await complaintRepository.requestValidation(complaintId);

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

  await notificationsService.notifyComplaintFollowers({
    complaintId,
    actorUserId: authenticatedUserId,
    type: "complaint_resolved",
    message: `A denúncia "${complaint.title}" foi marcada como resolvida pelo autor.`,
    sendPush: false,
  });

  return await usersService.enrichWithCreatedByUsername(updated);
};
