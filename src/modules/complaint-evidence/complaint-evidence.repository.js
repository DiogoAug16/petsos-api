import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_evidence`;
const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

export const create = async (complaintId, evidenceData) => {
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);
  const complaintDoc = await complaintRef.get();

  if (!complaintDoc.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  const docRef = db.collection(COLLECTION).doc();

  const evidence = {
    complaintId,
    ...evidenceData,
    createdAt: new Date(),
  };

  await docRef.set(evidence);

  return serialize(docRef.id, evidence);
};

export const getByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  const results = snapshot.docs.map((doc) => serialize(doc.id, doc.data()));
  return results.sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });
};

export const exists = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .limit(1)
    .get();

  return !snapshot.empty;
};

export const updateStatusByIds = async (evidenceIds, status) => {
  const batch = db.batch();
  for (const id of evidenceIds) {
    batch.update(db.collection(COLLECTION).doc(id), { status });
  }
  await batch.commit();
};

export const rejectAllByComplaintId = async (complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.update(doc.ref, { status: "rejected" });
  });
  await batch.commit();
};
