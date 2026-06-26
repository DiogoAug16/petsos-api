import * as complaintVotesRepository from "./complaint-votes.repository.js";
import * as complaintRepository from "../complaints/complaints.repository.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as complaintVolunteersRepository from "../complaint-volunteers/complaint-volunteers.repository.js";
import * as complaintEvidenceRepository from "../complaint-evidence/complaint-evidence.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const VOTING_QUORUM_PERCENTAGE = 0.25;
const OWNER_RESPONSE_DAYS = 7;

const getRequiredRate = (totalEligible) => {
  if (totalEligible <= 3) return 0.6;
  if (totalEligible <= 6) return 0.65;
  return 0.7;
};

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
  const requiredRate = getRequiredRate(totalEligible);
  const approvalRate = counts.total === 0 ? 0 : counts.approved / counts.total;
  const rejectionRate = counts.total === 0 ? 0 : counts.rejected / counts.total;
  const quorumReached = counts.total >= quorumRequired;
  const approvalRateReached = approvalRate >= requiredRate;
  const rejectionRateReached = rejectionRate >= requiredRate;

  return {
    quorumRequired,
    approvalRate,
    rejectionRate,
    approvalRateRequired: requiredRate,
    rejectionRateRequired: requiredRate,
    quorumReached,
    approvalRateReached,
    rejectionRateReached,
    canResolve: totalEligible > 0 && quorumReached && approvalRateReached,
    canReject: totalEligible > 0 && quorumReached && rejectionRateReached,
  };
};

const getCommunityVoteDecision = ({ complaint, counts, totalEligible }) => {
  if (!isVotingEnabled(complaint)) {
    throw new ValidationError(
      `Votação só é permitida após abertura por voluntário ou ${OWNER_RESPONSE_DAYS} dias sem resposta do criador`,
      ERROR_CODES.COMPLAINT_INVALID_STATUS_TRANSITION,
    );
  }

  const votingProgress = getVotingProgress(counts, totalEligible);
  const isEvidenceSelection =
    complaint.validationRequestReasonType === "evidence_selection";
  const isClosingReason = ["already_resolved", "false_report"].includes(
    complaint.validationRequestReasonType,
  );

  if (votingProgress.canResolve) {
    const targetStatus = isClosingReason
      ? COMPLAINT_STATUS.CLOSED
      : COMPLAINT_STATUS.RESOLVED;
    const decisionId = `${complaint.id}:community:${targetStatus}`;
    const metadata = isClosingReason
      ? {
          closedBy: "community",
          closedAt: new Date(),
          validationCount: counts.approved,
          communityDecisionId: decisionId,
          validationFinalizedAt: new Date(),
        }
      : {
          resolvedBy: isEvidenceSelection ? "community_evidence_vote" : "community",
          resolvedAt: new Date(),
          validationCount: counts.approved,
          selectedEvidenceIds: isEvidenceSelection ? complaint.proposedEvidenceIds : null,
          communityDecisionId: decisionId,
          validationFinalizedAt: new Date(),
        };

    return {
      outcome: isClosingReason ? "closed" : "resolved",
      status: targetStatus,
      metadata,
      evidenceUpdates:
        isEvidenceSelection && complaint.proposedEvidenceIds?.length > 0
          ? complaint.proposedEvidenceIds.map((id) => ({
              ref: complaintEvidenceRepository.getDocRef(id),
              data: { status: "approved" },
            }))
          : [],
      notificationType: isClosingReason
        ? "complaint_closed_community"
        : "complaint_resolved_community",
      authorMessage: isClosingReason
        ? `Sua denúncia "${complaint.title}" foi fechada pela comunidade com ${counts.approved} voto(s).`
        : `Sua denúncia "${complaint.title}" foi confirmada pela comunidade com ${counts.approved} validação(ões).`,
      followersMessage: isClosingReason
        ? `A denúncia "${complaint.title}" foi fechada por votação da comunidade (${counts.approved} votos).`
        : `A denúncia "${complaint.title}" foi resolvida por votação da comunidade (${counts.approved} validações).`,
      responseMessage: isClosingReason
        ? "Voto registrado. Denúncia fechada por votação da comunidade."
        : "Voto registrado. Denúncia resolvida por votação da comunidade.",
      reason: isEvidenceSelection
        ? "community_evidence_approval"
        : "community_quorum_approval",
      votingProgress,
    };
  }

  if (votingProgress.canReject) {
    if (isEvidenceSelection) {
      return {
        outcome: "evidenceSelectionRejected",
        status: COMPLAINT_STATUS.AWAITING_VALIDATION,
        clearVotes: true,
        metadata: {
          proposedEvidenceIds: null,
          validationRequestedAt: null,
          validationRequestedBy: null,
          validationRequestReasonType: null,
          validationRequestReasonText: null,
        },
        notificationType: "status_change",
        followersMessage: `A proposta de evidências para "${complaint.title}" foi rejeitada pela comunidade. Uma nova votação pode ser aberta.`,
        responseMessage:
          "Proposta de evidências rejeitada. A denúncia continua aguardando validação.",
        reason: "community_evidence_rejection",
        votingProgress,
      };
    }

    const rejectedAt = new Date();
    const rejectionExpiresAt = new Date(rejectedAt.getTime() + 48 * 60 * 60 * 1000);

    return {
      outcome: "rejected",
      status: complaint.status,
      clearVotes: true,
      metadata: {
        rejectedBy: "community",
        rejectedAt,
        rejectionCount: counts.rejected,
        rejectionExpiresAt,
        validationRequestedAt: null,
        validationRequestedBy: null,
        validationRequestReasonType: null,
        validationRequestReasonText: null,
      },
      notificationType: "complaint_rejected_community",
      authorMessage: `Sua denúncia "${complaint.title}" foi rejeitada pela comunidade com ${counts.rejected} voto(s) contra.`,
      followersMessage: `A denúncia "${complaint.title}" foi rejeitada por votação da comunidade (${counts.rejected} votos contra).`,
      responseMessage: "Voto registrado. Denúncia rejeitada por votação da comunidade.",
      reason: "community_quorum_rejection",
      votingProgress,
    };
  }

  return {
    outcome: "pending",
    votingProgress,
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

  const eligibleVoters = await getEligibleVoters(complaintId, complaint.createdById);
  const totalEligible = eligibleVoters.size;
  const { counts, decision } =
    await complaintVotesRepository.voteAndApplyCommunityDecision({
      complaintId,
      userId,
      approved,
      resolveDecision: ({ complaint: latestComplaint, counts: latestCounts }) =>
        getCommunityVoteDecision({
          complaint: latestComplaint,
          counts: latestCounts,
          totalEligible,
        }),
    });

  if (["resolved", "closed", "rejected"].includes(decision.outcome)) {
    await notificationsService.createNotification({
      userId: complaint.createdById,
      complaintId,
      type: decision.notificationType,
      message: decision.authorMessage,
      sendPush: true,
    });

    await notificationsService.notifyComplaintFollowers({
      complaintId,
      actorUserId: complaint.createdById,
      type: decision.notificationType,
      message: decision.followersMessage,
      sendPush: false,
    });

    return {
      message: decision.responseMessage,
      resolved: decision.outcome === "resolved",
      closed: decision.outcome === "closed",
      rejected: decision.outcome === "rejected",
      votes: counts,
      totalEligible,
      reason: decision.reason,
      ...decision.votingProgress,
    };
  }

  if (decision.outcome === "evidenceSelectionRejected") {
    await notificationsService.notifyComplaintFollowers({
      complaintId,
      actorUserId: userId,
      type: decision.notificationType,
      message: decision.followersMessage,
      sendPush: false,
    });

    return {
      message: decision.responseMessage,
      rejected: true,
      evidenceSelectionRejected: true,
      votes: counts,
      totalEligible,
      reason: decision.reason,
      ...decision.votingProgress,
    };
  }

  return {
    message: "Voto registrado com sucesso",
    resolved: false,
    rejected: false,
    votes: counts,
    totalEligible,
    ...decision.votingProgress,
  };
};

export const voteEvidenceSelection = async ({ complaintId, userId, evidenceIds }) => {
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

  if (!evidenceIds || evidenceIds.length === 0) {
    throw new ValidationError("Selecione ao menos uma evidência");
  }

  await complaintVotesRepository.voteEvidenceSelection(complaintId, userId, evidenceIds);

  const selectionCounts =
    await complaintVotesRepository.countEvidenceSelections(complaintId);
  const eligibleVoters = await getEligibleVoters(complaintId, complaint.createdById);
  const totalEligible = eligibleVoters.size;
  const quorumRequired = Math.ceil(totalEligible * VOTING_QUORUM_PERCENTAGE);

  if (
    selectionCounts.totalVoters >= quorumRequired &&
    selectionCounts.topEvidences.length > 0
  ) {
    const topEvidenceIds = selectionCounts.topEvidences
      .filter(
        (e) => e.votes / selectionCounts.totalVoters >= getRequiredRate(totalEligible),
      )
      .map((e) => e.evidenceId);

    if (topEvidenceIds.length > 0) {
      await complaintEvidenceRepository.updateStatusByIds(topEvidenceIds, "approved");

      const decisionId = `${complaintId}:community:${COMPLAINT_STATUS.RESOLVED}:evidence-selection`;
      const finalization = await complaintRepository.setStatusWithMetadataOnce(
        complaintId,
        COMPLAINT_STATUS.RESOLVED,
        {
          resolvedBy: "community_evidence_vote",
          resolvedAt: new Date(),
          selectedEvidenceIds: topEvidenceIds,
          validationCount: selectionCounts.totalVoters,
          communityDecisionId: decisionId,
          validationFinalizedAt: new Date(),
        },
        decisionId,
      );

      if (finalization.applied) {
        await notificationsService.createNotification({
          userId: complaint.createdById,
          complaintId,
          type: "complaint_resolved_community",
          message: `Sua denúncia "${complaint.title}" foi confirmada pela comunidade com ${selectionCounts.totalVoters} validação(ões). Evidências selecionadas pela votação.`,
          sendPush: true,
        });

        await notificationsService.notifyComplaintFollowers({
          complaintId,
          actorUserId: complaint.createdById,
          type: "complaint_resolved_community",
          message: `A denúncia "${complaint.title}" foi resolvida por seleção de evidências da comunidade (${selectionCounts.totalVoters} votos).`,
          sendPush: false,
        });
      }

      return {
        message:
          "Voto registrado. Denúncia resolvida por seleção de evidências da comunidade.",
        resolved: true,
        selectedEvidenceIds: topEvidenceIds,
        selectionCounts,
      };
    }
  }

  return {
    message: "Voto de seleção de evidências registrado com sucesso",
    resolved: false,
    selectionCounts,
  };
};

export const getEvidenceSelectionStatus = async (complaintId, userId) => {
  const complaint = await complaintRepository.getDetail(complaintId);
  const votingEnabled = isVotingEnabled(complaint);
  const selectionCounts =
    await complaintVotesRepository.countEvidenceSelections(complaintId);
  const hasVoted = userId
    ? await complaintVotesRepository.hasVotedEvidenceSelection(complaintId, userId)
    : false;
  const userSelection = userId
    ? await complaintVotesRepository.getUserEvidenceSelection(complaintId, userId)
    : null;

  const eligibleVoters = await getEligibleVoters(complaintId, complaint.createdById);
  const totalEligible = eligibleVoters.size;
  const quorumRequired = Math.ceil(totalEligible * VOTING_QUORUM_PERCENTAGE);

  return {
    complaintId,
    votingEnabled,
    hasVoted,
    userSelection,
    selectionCounts,
    totalEligible,
    quorumRequired,
  };
};

const checkAndClearExpiredRejection = async (complaint, complaintId) => {
  if (
    !complaint.rejectedBy ||
    complaint.rejectedBy !== "community" ||
    !complaint.rejectionExpiresAt
  ) {
    return complaint;
  }

  const expiresAt =
    complaint.rejectionExpiresAt?.toDate?.() ?? complaint.rejectionExpiresAt;
  const now = Date.now();

  if (new Date(expiresAt).getTime() > now) {
    return complaint;
  }

  await complaintRepository.setStatusWithMetadata(complaintId, complaint.status, {
    rejectedBy: null,
    rejectedAt: null,
    rejectionCount: null,
    rejectionExpiresAt: null,
  });

  return await complaintRepository.getDetail(complaintId);
};

export const getStatus = async (complaintId, userId) => {
  let complaint = await complaintRepository.getDetail(complaintId);
  complaint = await checkAndClearExpiredRejection(complaint, complaintId);
  const counts = await complaintVotesRepository.countByComplaintId(complaintId);
  const hasVoted = userId
    ? await complaintVotesRepository.hasVoted(complaintId, userId)
    : false;

  const eligibleVoters = await getEligibleVoters(complaintId, complaint.createdById);
  const totalEligible = eligibleVoters.size;
  const votingProgress = getVotingProgress(counts, totalEligible);

  const votingEnabled = isVotingEnabled(complaint);

  const rejectionInfo =
    complaint.rejectedBy === "community" && complaint.rejectionExpiresAt
      ? {
          rejectedAt: complaint.rejectedAt,
          rejectionExpiresAt: complaint.rejectionExpiresAt,
          rejectionCount: complaint.rejectionCount,
        }
      : null;

  return {
    complaintId,
    votingEnabled,
    hasVoted,
    votes: counts,
    totalEligible,
    rejectionInfo,
    proposedEvidenceIds: complaint.proposedEvidenceIds || null,
    reasonType: complaint.validationRequestReasonType || null,
    ...votingProgress,
  };
};
