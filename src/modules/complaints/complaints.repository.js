import admin from "firebase-admin";
import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;
const { GeoPoint } = admin.firestore;

const prepareLocationToSave = (data) => {
  if (!data.location) return data;

  const { latitude, longitude } = data.location;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return data;
  }

  return {
    ...data,
    location: new GeoPoint(latitude, longitude),
  };
};

const prepareLocationToReturn = (complaint) => {
  if (!complaint?.location) return complaint;

  return {
    ...complaint,
    location: {
      latitude: complaint.location.latitude,
      longitude: complaint.location.longitude,
    },
  };
};

export const create = async (data) => {
  const preparedData = prepareLocationToSave(data);

  const docRef = await db.collection(COLLECTION).add(preparedData);
  return prepareLocationToReturn({
    id: docRef.id,
    ...preparedData,
    createdAt: data.createdAt.toISOString(),
    updatedAt: data.updatedAt.toISOString(),
  });
};

export const getAll = async () => {
  const snapshot = await db.collection(COLLECTION).get();
  return snapshot.docs.map((doc) =>
    prepareLocationToReturn(serialize(doc.id, doc.data())),
  );
};

export const getDetail = async (id) => {
  const docRef = await db.collection(COLLECTION).doc(id).get();
  if (!docRef.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  return prepareLocationToReturn(serialize(docRef.id, docRef.data()));
};

export const patch = async (id, data) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  const preparedData = prepareLocationToSave(data);

  await docRef.update(preparedData);

  const updatedDoc = (await docRef.get()).data();
  return prepareLocationToReturn(serialize(id, updatedDoc));
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};
