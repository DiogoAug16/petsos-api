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
