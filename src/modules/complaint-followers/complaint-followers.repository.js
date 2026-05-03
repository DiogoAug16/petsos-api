import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_followers`;

const makeDocId = (complaintId, userId) => `${complaintId}_${userId}`;

export const follow = async (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);
  const docRef = db.collection(COLLECTION).doc(docId);

  const doc = await docRef.get();

  if (doc.exists) {
    throw new ConflictError("Usuário já acompanha esta denúncia");
  }

  await docRef.set({
    complaintId,
    userId,
    createdAt: new Date(),
  });
};

export const unfollow = async (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);

  await db.collection(COLLECTION).doc(docId).delete();
};

export const getFollowers = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.docs.map((doc) => doc.data().userId);
};

export const isFollowing = async (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);
  const doc = await db.collection(COLLECTION).doc(docId).get();

  return doc.exists;
};

export const countByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.size;
};
