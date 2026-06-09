import * as complaintVotesRepository from "./complaint-votes.repository.js";
import * as complaintRepository from "../complaints/complaints.repository.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as complaintVolunteersRepository from "../complaint-volunteers/complaint-volunteers.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const VOTING_QUORUM_PERCENTAGE = 0.25;
const APPROVAL_RATE_REQUIRED = 0.7;
const OWNER_RESPONSE_DAYS = 7;

const isOwnerInactive = (complaint) => {
  const statusUpdatedAt =
    complaint.statusUpdatedAt?.toDate?.() ?? complaint.statusUpdatedAt ?? null;

  if (!statusUpdatedAt) return false;

  const daysSinceUpdate =
    (Date.now() - new Date(statusUpdatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceUpdate >= OWNER_RESPONSE_DAYS;
};

const isVotingEnabled = (complaint) => {
  return (
    complaint.status === COMPLAINT_STATUS.AWAITING_VALIDATION &&
    (Boolean(complaint.validationRequestedAt) || isOwnerInactive(complaint))
  );
};

const getEligibleVoters = async (complaintId, authorId) => {
  const [followerIds, volunteerIds] = await Promise.all([
    complaintFollowersRepository.getFollowers(complaintId),
    complaintVolunteersRepository.getVolunteers(complaintId),
  ]);

  const eligibleVoters = new Set([...followerIds, ...volunteerIds]);
  eligibleVoters.delete(authorId);

  return eligibleVoters;
};

const getVotingProgress = (counts, totalEligible) => {
  const quorumRequired = Math.ceil(totalEligible * VOTING_QUORUM_PERCENTAGE);
  const approvalRate = counts.total === 0 ? 0 : counts.approved / counts.total;
  const quorumReached = counts.total >= quorumRequired;
  const approvalRateReached = approvalRate >= APPROVAL_RATE_REQUIRED;

  return {
    quorumRequired,
    approvalRate,
    approvalRateRequired: APPROVAL_RATE_REQUIRED,
    quorumReached,
    approvalRateReached,
    canResolve: totalEligible > 0 && quorumReached && approvalRateReached,
  };
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

  const eligibleVoters = await getEligibleVoters(complaintId, complaint.createdById);
  const totalEligible = eligibleVoters.size;

  const counts = await complaintVotesRepository.countByComplaintId(complaintId);
  const votingProgress = getVotingProgress(counts, totalEligible);

  if (votingProgress.canResolve) {
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
      votes: counts,
      totalEligible,
      reason: "community_quorum_approval",
      ...votingProgress,
    };
  }

  return {
    message: "Voto registrado com sucesso",
    resolved: false,
    votes: counts,
    totalEligible,
    ...votingProgress,
  };
};

export const getStatus = async (complaintId, userId) => {
  const complaint = await complaintRepository.getDetail(complaintId);
  const counts = await complaintVotesRepository.countByComplaintId(complaintId);
  const hasVoted = userId
    ? await complaintVotesRepository.hasVoted(complaintId, userId)
    : false;

  const eligibleVoters = await getEligibleVoters(complaintId, complaint.createdById);
  const totalEligible = eligibleVoters.size;
  const votingProgress = getVotingProgress(counts, totalEligible);

  const votingEnabled = isVotingEnabled(complaint);

  return {
    complaintId,
    votingEnabled,
    hasVoted,
    votes: counts,
    totalEligible,
    ...votingProgress,
  };
};
