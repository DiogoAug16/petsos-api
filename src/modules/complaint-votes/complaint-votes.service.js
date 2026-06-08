import * as complaintVotesRepository from "./complaint-votes.repository.js";
import * as complaintRepository from "../complaints/complaints.repository.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as complaintVolunteersRepository from "../complaint-volunteers/complaint-volunteers.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { env } from "../../config/env.js";

const VOTE_THRESHOLD_PERCENTAGE = 0.5;
const OWNER_RESPONSE_DAYS = 7;

const isOwnerInactive = (complaint) => {
  const statusUpdatedAt =
    complaint.statusUpdatedAt?.toDate?.() ?? complaint.statusUpdatedAt ?? null;

  if (!statusUpdatedAt) return false;

  const daysSinceUpdate =
    (Date.now() - new Date(statusUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate >= OWNER_RESPONSE_DAYS;
};

const checkAndApplyAutoResolveByValidationCount = async (complaint, complaintId) => {
  // Se já está resolvido, não fazer nada
  if (complaint.status === COMPLAINT_STATUS.RESOLVED) {
    return { autoResolved: false };
  }

  const counts = await complaintVotesRepository.countByComplaintId(complaintId);
  const minValidations = env.complaints.minValidationsAutoResolve;

  // Se o total de validações atingiu o threshold, resolver automaticamente
  if (counts.total >= minValidations) {
    await complaintRepository.setStatusWithMetadata(
      complaintId,
      COMPLAINT_STATUS.RESOLVED,
      {
        resolvedBy: "community",
        resolvedAt: new Date(),
      },
    );

    return { autoResolved: true, reason: "validation_count_threshold" };
  }

  return { autoResolved: false };
};

const isVotingEnabled = (complaint) => {
  return (
    complaint.status === COMPLAINT_STATUS.AWAITING_VALIDATION &&
    (Boolean(complaint.validationRequestedAt) || isOwnerInactive(complaint))
  );
};

export const vote = async ({ complaintId, userId, approved }) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  if (!isVotingEnabled(complaint)) {
    throw new ValidationError(
      `Votação só é permitida após abertura por voluntário ou ${OWNER_RESPONSE_DAYS} dias sem resposta do criador`,
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  if (complaint.createdById === userId) {
    throw new ForbiddenError(
      "O criador da denúncia deve usar a validação direta, não a votação",
    );
  }

  const isFollower = await complaintFollowersRepository.isFollowing(complaintId, userId);
  const isVolunteer = await complaintVolunteersRepository.isVolunteer(
    complaintId,
    userId,
  );

  if (!isFollower && !isVolunteer) {
    throw new ForbiddenError("Apenas seguidores ou voluntários podem votar");
  }

  await complaintVotesRepository.vote(complaintId, userId, approved);

  const followerIds = await complaintFollowersRepository.getFollowers(complaintId);
  const volunteerIds = await complaintVolunteersRepository.getVolunteers(complaintId);
  const eligibleVoters = new Set([...followerIds, ...volunteerIds]);
  eligibleVoters.delete(complaint.createdById);
  const totalEligible = eligibleVoters.size;

  const counts = await complaintVotesRepository.countByComplaintId(complaintId);
  const approvalThreshold = Math.ceil(totalEligible * VOTE_THRESHOLD_PERCENTAGE);

  // Verificar resolução por percentual (50%)
  if (counts.approved >= approvalThreshold) {
    await complaintRepository.setStatusWithMetadata(
      complaintId,
      COMPLAINT_STATUS.RESOLVED,
      {
        resolvedBy: "community",
        resolvedAt: new Date(),
      },
    );

    await notificationsService.notifyComplaintFollowers({
      complaintId,
      actorUserId: userId,
      type: "status_change",
      message: `A denúncia "${complaint.title}" foi resolvida por votação da comunidade.`,
      sendPush: false,
    });

    return {
      message: "Voto registrado. Denúncia resolvida por votação da comunidade.",
      resolved: true,
      reason: "approval_percentage_threshold",
    };
  }

  // Verificar resolução por contagem total de validações
  const autoResolveCheck = await checkAndApplyAutoResolveByValidationCount(
    complaint,
    complaintId,
  );
  if (autoResolveCheck.autoResolved) {
    await notificationsService.notifyComplaintFollowers({
      complaintId,
      actorUserId: userId,
      type: "status_change",
      message: `A denúncia "${complaint.title}" foi resolvida automaticamente pela comunidade (limite de validações atingido).`,
      sendPush: false,
    });

    return {
      message: `Voto registrado. Denúncia resolvida automaticamente (${env.complaints.minValidationsAutoResolve} validações atingidas).`,
      resolved: true,
      reason: "validation_count_threshold",
    };
  }

  return {
    message: "Voto registrado com sucesso",
    resolved: false,
    votes: counts,
    threshold: approvalThreshold,
    autoResolveThreshold: env.complaints.minValidationsAutoResolve,
  };
};

export const getStatus = async (complaintId, userId) => {
  const complaint = await complaintRepository.getDetail(complaintId);
  const counts = await complaintVotesRepository.countByComplaintId(complaintId);
  const hasVoted = userId
    ? await complaintVotesRepository.hasVoted(complaintId, userId)
    : false;

  const followerIds = await complaintFollowersRepository.getFollowers(complaintId);
  const volunteerIds = await complaintVolunteersRepository.getVolunteers(complaintId);
  const eligibleVoters = new Set([...followerIds, ...volunteerIds]);
  eligibleVoters.delete(complaint.createdById);

  const votingEnabled = isVotingEnabled(complaint);

  return {
    complaintId,
    votingEnabled,
    hasVoted,
    votes: counts,
    threshold: Math.ceil(eligibleVoters.size * VOTE_THRESHOLD_PERCENTAGE),
    totalEligible: eligibleVoters.size,
    autoResolveThreshold: env.complaints.minValidationsAutoResolve,
    validationsProgress: {
      current: counts.total,
      required: env.complaints.minValidationsAutoResolve,
      willAutoResolve:
        counts.total >= env.complaints.minValidationsAutoResolve &&
        complaint.status !== COMPLAINT_STATUS.RESOLVED,
    },
  };
};
