import admin from "firebase-admin";
import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaint_volunteers`;
const COMPLAINTS_COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const makeDocId = (complaintId, userId) => `${complaintId}_${userId}`;

const getVolunteerDocRef = (complaintId, userId) => {
  const docId = makeDocId(complaintId, userId);
  return db.collection(COLLECTION).doc(docId);
};

const getComplaintSnapshotOrFail = async (complaintId) => {
  const complaintDoc = await db.collection(COMPLAINTS_COLLECTION).doc(complaintId).get();

  if (!complaintDoc.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  return complaintDoc;
};

export const volunteer = async (complaintId, userId) => {
  const docRef = getVolunteerDocRef(complaintId, userId);
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);

  await db.runTransaction(async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    const complaint = complaintDoc.data();

    if (complaint.createdById === userId) {
      throw new ConflictError("O criador da denúncia não pode se voluntariar");
    }

    const doc = await transaction.get(docRef);

    if (doc.exists) {
      throw new ConflictError("Usuário já é voluntário nesta denúncia");
    }

    transaction.set(docRef, {
      complaintId,
      userId,
      createdAt: new Date(),
    });

    transaction.update(complaintRef, {
      volunteersCount: admin.firestore.FieldValue.increment(1),
    });
  });
};

export const unvolunteer = async (complaintId, userId) => {
  const docRef = getVolunteerDocRef(complaintId, userId);
  const complaintRef = db.collection(COMPLAINTS_COLLECTION).doc(complaintId);

  await db.runTransaction(async (transaction) => {
    const complaintDoc = await transaction.get(complaintRef);

    if (!complaintDoc.exists) {
      throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
    }

    const doc = await transaction.get(docRef);

    if (!doc.exists) return;

    const currentCount = complaintDoc.data().volunteersCount ?? 0;
    const updatedCount = currentCount > 0 ? admin.firestore.FieldValue.increment(-1) : 0;

    transaction.delete(docRef);
    transaction.update(complaintRef, {
      volunteersCount: updatedCount,
    });
  });
};

export const getVolunteers = async (complaintId) => {
  await getComplaintSnapshotOrFail(complaintId);

  const snapshot = await db
    .collection(COLLECTION)
    .where("complaintId", "==", complaintId)
    .get();

  return snapshot.docs.map((doc) => doc.data().userId);
};

export const isVolunteer = async (complaintId, userId) => {
  const docRef = getVolunteerDocRef(complaintId, userId);
  const doc = await docRef.get();
  return doc.exists;
};

export const countByComplaintId = async (complaintId) => {
  const complaintDoc = await getComplaintSnapshotOrFail(complaintId);
  return complaintDoc.data().volunteersCount ?? 0;
};
