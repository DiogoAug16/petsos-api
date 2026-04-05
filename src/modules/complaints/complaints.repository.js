import { db, GeoPoint } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const toGeoPoint = (data) => {
  if (!data.location) return data;
  const { latitude, longitude } = data.location;
  return { ...data, location: new GeoPoint(latitude, longitude) };
};

export const create = async (data) => {
  const prepared = toGeoPoint(data);
  const docRef = await db.collection(COLLECTION).add(prepared);
  return serialize(docRef.id, {
    ...prepared,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  });
};

export const getAll = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) => serialize(doc.id, doc.data()));
};

export const getDetail = async (id) => {
  const doc = await db.collection(COLLECTION).doc(id).get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  return serialize(doc.id, doc.data());
};

export const patch = async (id, data) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  const prepared = toGeoPoint(data);
  await docRef.update(prepared);

  const updated = (await docRef.get()).data();
  return serialize(id, updated);
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
