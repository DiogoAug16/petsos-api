import * as complaintVotesRepository from "./complaint-votes.repository.js";
import * as complaintRepository from "../complaints/complaints.repository.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as complaintVolunteersRepository from "../complaint-volunteers/complaint-volunteers.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

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

export const vote = async ({ complaintId, userId, approved }) => {
  const complaint = await complaintRepository.getDetail(complaintId);

  if (complaint.status !== COMPLAINT_STATUS.AWAITING_VALIDATION) {
    throw new ValidationError(
      "Votação só é permitida em denúncias aguardando validação",
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  if (complaint.createdById === userId) {
    throw new ForbiddenError(
      "O criador da denúncia deve usar a validação direta, não a votação",
    );
  }

  if (!isOwnerInactive(complaint)) {
    throw new ValidationError(
      `Votação só é liberada após ${OWNER_RESPONSE_DAYS} dias sem resposta do criador`,
      ERROR_CODES.COMPLAINT_VALIDATION,
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

  if (counts.approved >= approvalThreshold) {
    await complaintRepository.setStatus(complaintId, COMPLAINT_STATUS.RESOLVED);

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
    };
  }

  return {
    message: "Voto registrado com sucesso",
    resolved: false,
    votes: counts,
    threshold: approvalThreshold,
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

  const votingEnabled =
    complaint.status === COMPLAINT_STATUS.AWAITING_VALIDATION &&
    isOwnerInactive(complaint);

  return {
    complaintId,
    votingEnabled,
    hasVoted,
    votes: counts,
    threshold: Math.ceil(eligibleVoters.size * VOTE_THRESHOLD_PERCENTAGE),
    totalEligible: eligibleVoters.size,
  };
};
