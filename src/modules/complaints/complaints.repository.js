import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/notFoundError.js";
import { ERROR_CODES } from "../../shared/errors/errorCodes.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;

export const create = async (data) => {
  const docRef = await db.collection(COLLECTION).add(data);
  return {
    id: docRef.id,
    ...data,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  };
};

export const getAll = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt.toDate().toISOString(),
      updatedAt: data.updatedAt.toDate().toISOString(),
    };
  });
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};

export const getDetail = async (id) => {
  const docRef = await db.collection(COLLECTION).doc(id).get();
  if (!docRef.exists) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }
  const data = docRef.data();
  return {
    id: docRef.id,
    ...data,
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
  };
};
