import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { serialize } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_followers`;

const makeDocId = (complaintId, userId) => `${complaintId}_${userId}`;

export const create = async ({ complaintId, userId, createdAt }) => {
  const docId = makeDocId(complaintId, userId);
  const docRef = db.collection(COLLECTION).doc(docId);

  const doc = await docRef.get();

  if (doc.exists) {
    return serialize(doc.id, doc.data());
  }

  const data = {
    complaintId,
    userId,
    createdAt,
  };

  await docRef.set(data);

  return serialize(docId, data);
};

export const remove = async ({ complaintId, userId }) => {
  const docId = makeDocId(complaintId, userId);
  await db.collection(COLLECTION).doc(docId).delete();
};

export const countByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.size;
};

export const findByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.docs.map((doc) => serialize(doc.id, doc.data()));
};
