import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_votes`;
const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const makeDocId = (complaintId, userId) => `${complaintId}_${userId}`;

export const vote = async (complaintId, userId, approved) => {
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);
  const complaintDoc = await complaintRef.get();

  if (!complaintDoc.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  const docId = makeDocId(complaintId, userId);
  const docRef = db.collection(COLLECTION).doc(docId);
  const existing = await docRef.get();

  if (existing.exists) {
    throw new ConflictError("Você já votou nesta denúncia");
  }

  await docRef.set({
    complaintId,
    userId,
    approved,
    createdAt: new Date(),
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
  const existing = await docRef.get();

  if (existing.exists) {
    throw new ConflictError("Você já votou na seleção de evidências desta denúncia");
  }

  await docRef.set({
    complaintId,
    userId,
    evidenceIds,
    createdAt: new Date(),
  });
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
