import * as complaintEvidenceRepository from "./complaint-evidence.repository.js";
import * as complaintRepository from "../complaints/complaints.repository.js";
import * as complaintVolunteersRepository from "../complaint-volunteers/complaint-volunteers.repository.js";
import * as usersService from "../users/users.service.js";
import * as notificationsService from "../notifications/notifications.service.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

export const submitEvidence = async (complaintId, userId, { description, photos }) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  const isAuthor = complaint.createdById === userId;
  const isVolunteer = await complaintVolunteersRepository.isVolunteer(
    complaintId,
    userId,
  );
  if (!isAuthor && !isVolunteer) {
    throw new ForbiddenError("Apenas o autor ou voluntários podem enviar evidências");
  }

  if (complaint.status !== COMPLAINT_STATUS.IN_PROGRESS) {
    throw new ValidationError(
      "Apenas denúncias em andamento aceitam evidências",
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  const evidence = await complaintEvidenceRepository.create(complaintId, {
    userId,
    description,
    photos,
  });

  await complaintRepository.setStatus(complaintId, COMPLAINT_STATUS.AWAITING_VALIDATION);

  await notificationsService.notifyComplaintFollowers({
    complaintId,
    actorUserId: userId,
    type: "status_change",
    message: `Evidência enviada para a denúncia "${complaint.title}". Aguardando validação.`,
    sendPush: false,
  });

  return evidence;
};

export const getByComplaintId = async (complaintId) => {
  const evidences = await complaintEvidenceRepository.getByComplaintId(complaintId);

  const userIds = [...new Set(evidences.map((e) => e.userId))];
  const usersById = await usersService.getUsernamesByIds(userIds);

  return evidences.map((evidence) => ({
    ...evidence,
    username: usersById.get(evidence.userId) || null,
  }));
};

export const exists = async (complaintId) => {
  return await complaintEvidenceRepository.exists(complaintId);
};

export const validateEvidence = async (
  complaintId,
  userId,
  { approved, evidenceIds },
) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  if (complaint.createdById !== userId) {
    throw new ForbiddenError("Apenas o criador da denúncia pode validar evidências");
  }

  if (complaint.status !== COMPLAINT_STATUS.AWAITING_VALIDATION) {
    throw new ValidationError(
      "Apenas denúncias aguardando validação podem ser validadas",
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  if (!evidenceIds || evidenceIds.length === 0) {
    throw new ValidationError("Selecione ao menos uma evidência para validar");
  }

  const complaintEvidences =
    await complaintEvidenceRepository.getByComplaintId(complaintId);
  const complaintEvidenceIds = new Set(complaintEvidences.map((evidence) => evidence.id));
  const invalidEvidenceIds = evidenceIds.filter((id) => !complaintEvidenceIds.has(id));

  if (invalidEvidenceIds.length > 0) {
    throw new ValidationError(
      {
        fieldErrors: {
          evidenceIds: [
            "Uma ou mais evidências não foram encontradas para esta denúncia",
          ],
        },
      },
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (approved) {
    await complaintEvidenceRepository.updateStatusByIds(evidenceIds, "approved");
    await complaintRepository.setStatus(complaintId, COMPLAINT_STATUS.RESOLVED);

    await notificationsService.notifyComplaintFollowers({
      complaintId,
      actorUserId: userId,
      type: "status_change",
      message: `A denúncia "${complaint.title}" foi marcada como resolvida.`,
      sendPush: false,
    });

    return { message: "Evidências aprovadas. Denúncia resolvida.", resolved: true };
  }

  await complaintEvidenceRepository.updateStatusByIds(evidenceIds, "rejected");

  const remaining = await complaintEvidenceRepository.getByComplaintId(complaintId);
  const hasPending = remaining.some((e) => !e.status || e.status === "pending");

  if (!hasPending) {
    await complaintRepository.setStatus(complaintId, COMPLAINT_STATUS.IN_PROGRESS);

    await notificationsService.notifyComplaintFollowers({
      complaintId,
      actorUserId: userId,
      type: "status_change",
      message: `A evidência da denúncia "${complaint.title}" foi rejeitada. Denúncia voltou para em andamento.`,
      sendPush: false,
    });
  }

  return {
    message: hasPending
      ? "Evidências rejeitadas. Ainda há evidências pendentes."
      : "Evidências rejeitadas. Denúncia voltou para em andamento.",
    resolved: false,
    hasPending,
  };
};
