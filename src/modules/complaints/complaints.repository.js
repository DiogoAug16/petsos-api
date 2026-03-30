import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";

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
  return snapshot.docs.map((doc) => serialize(doc.id, doc.data()));
};

export const getDetail = async (id) => {
  const docRef = await db.collection(COLLECTION).doc(id).get();
  if (!docRef.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  return serialize(docRef.id, docRef.data());
};

export const patch = async (id, data) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  await docRef.update(data);

  const updatedDoc = (await docRef.get()).data();
  return serialize(id, updatedDoc);
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
