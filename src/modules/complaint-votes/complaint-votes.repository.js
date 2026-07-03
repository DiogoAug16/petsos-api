import { db, FieldValue } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_votes`;
const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const makeDocId = (complaintId, userId) => `${complaintId}_${userId}`;

const isAlreadyExistsError = (error) =>
  error?.code === 6 || error?.code === "already-exists";

const getVoteCounts = (votes) => {
  const approved = votes.filter((v) => v.approved).length;
  const rejected = votes.filter((v) => !v.approved).length;
  return { approved, rejected, total: votes.length };
};

const getMetadataUpdate = (metadata = {}) => {
  const updateData = {};
  for (const [key, value] of Object.entries(metadata)) {
    updateData[key] = value === null ? FieldValue.delete() : value;
  }
  return updateData;
};

export const vote = async (complaintId, userId, approved) => {
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);
  const complaintDoc = await complaintRef.get();

  if (!complaintDoc.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  const docId = makeDocId(complaintId, userId);
  const docRef = db.collection(COLLECTION).doc(docId);

  try {
    await docRef.create({
      complaintId,
      userId,
      approved,
      createdAt: new Date(),
    });
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      throw new ConflictError("Você já votou nesta denúncia");
    }
    throw error;
  }
};

export const voteAndApplyCommunityDecision = async ({
  complaintId,
  userId,
  approved,
  resolveDecision,
}) => {
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);
  const voteRef = db.collection(COLLECTION).doc(makeDocId(complaintId, userId));
  const votesQuery = db.collection(COLLECTION).where("complaintId", "==", complaintId);

  return await db.runTransaction(async (transaction) => {
    const [complaintDoc, existingVoteDoc, votesSnapshot] = await Promise.all([
      transaction.get(complaintRef),
      transaction.get(voteRef),
      transaction.get(votesQuery),
    ]);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    if (existingVoteDoc.exists) {
      throw new ConflictError("Você já votou nesta denúncia");
    }

    const complaint = serialize(complaintDoc.id, complaintDoc.data());
    const existingVotes = votesSnapshot.docs.map((doc) => doc.data());
    const counts = getVoteCounts([...existingVotes, { complaintId, userId, approved }]);
    const decision = resolveDecision({ complaint, counts });

    if (!decision?.clearVotes) {
      transaction.create(voteRef, {
        complaintId,
        userId,
        approved,
        createdAt: new Date(),
      });
    }

    if (decision?.clearVotes) {
      for (const doc of votesSnapshot.docs) {
        transaction.delete(doc.ref);
      }
    }

    if (decision?.evidenceUpdates?.length) {
      for (const { ref, data } of decision.evidenceUpdates) {
        transaction.update(ref, data);
      }
    }

    if (decision?.status) {
      transaction.update(complaintRef, {
        status: decision.status,
        statusUpdatedAt: new Date(),
        updatedAt: new Date(),
        ...getMetadataUpdate(decision.metadata),
      });
    }

    return {
      counts,
      decision,
    };
  });
};

export const getVotesByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.docs.map((doc) => doc.data());
};

export const countByComplaintId = async (complaintId) => {
  const votes = await getVotesByComplaintId(complaintId);
  const approved = votes.filter((v) => v.approved).length;
  const rejected = votes.filter((v) => !v.approved).length;

  return { approved, rejected, total: votes.length };
};

export const hasVoted = async (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);
  const doc = await db.collection(COLLECTION).doc(docId).get();
  return doc.exists;
};

export const clearVotesByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  if (snapshot.empty) return;

  const batch = db.batch();
  snapshot.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
};

const EVIDENCE_SELECTION_COLLECTION = `${env.firebase.collectionPrefix}complaint_evidence_votes`;

export const voteEvidenceSelection = async (complaintId, userId, evidenceIds) => {
  const docId = makeDocId(complaintId, userId);
  const docRef = db.collection(EVIDENCE_SELECTION_COLLECTION).doc(docId);

  try {
    await docRef.create({
      complaintId,
      userId,
      evidenceIds,
      createdAt: new Date(),
    });
  } catch (error) {
    if (isAlreadyExistsError(error)) {
      throw new ConflictError("Você já votou na seleção de evidências desta denúncia");
    }
    throw error;
  }
};

export const hasVotedEvidenceSelection = async (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);
  const doc = await db.collection(EVIDENCE_SELECTION_COLLECTION).doc(docId).get();
  return doc.exists;
};

export const getUserEvidenceSelection = async (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);
  const doc = await db.collection(EVIDENCE_SELECTION_COLLECTION).doc(docId).get();
  if (!doc.exists) return null;
  return doc.data().evidenceIds || [];
};

export const countEvidenceSelections = async (complaintId) => {
  const snapshot = await db
    .collection(EVIDENCE_SELECTION_COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  const votes = snapshot.docs.map((doc) => doc.data());
  const totalVoters = votes.length;

  const evidenceTally = {};
  for (const vote of votes) {
    for (const evidenceId of vote.evidenceIds) {
      evidenceTally[evidenceId] = (evidenceTally[evidenceId] || 0) + 1;
    }
  }

  const topEvidences = Object.entries(evidenceTally)
    .map(([evidenceId, voteCount]) => ({ evidenceId, votes: voteCount }))
    .sort((a, b) => b.votes - a.votes);

  return { totalVoters, topEvidences };
};
