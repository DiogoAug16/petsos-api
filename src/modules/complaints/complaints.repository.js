import { db, GeoPoint } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";
import { distanceBetween } from "geofire-common";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const toGeoPoint = (data) => {
  if (!data.location) return data;
  const { latitude, longitude } = data.location;
  return { ...data, location: new GeoPoint(latitude, longitude) };
};

export const createId = () => db.collection(COLLECTION).doc().id;

export const create = async (data, id) => {
  const prepared = toGeoPoint(data);
  const docRef = db.collection(COLLECTION).doc(id);

  await docRef.set(prepared);

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

export const setStatus = async (id, status) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();
  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  await docRef.update({ status, statusUpdatedAt: new Date(), updatedAt: new Date() });

  const updated = (await docRef.get()).data();
  return serialize(id, updated);
};

export const deleteComplaint = async (id) => {
  await db.collection(COLLECTION).doc(id).delete();
};

export const getByIds = async (ids) => {
  if (!ids || ids.length === 0) return [];

  const docRefs = ids.map((id) => db.collection(COLLECTION).doc(id));

  const chunks = [];
  for (let offset = 0; offset < docRefs.length; offset += 100) {
    chunks.push(docRefs.slice(offset, offset + 100));
  }

  const snapshots = await Promise.all(chunks.map((chunk) => db.getAll(...chunk)));

  const complaints = snapshots
    .flat()
    .filter((doc) => doc.exists)
    .map((doc) => serialize(doc.id, doc.data()));

  return complaints;
};

export const findNearestWithinRadius = async (lat, lng, radiusKm) => {
  const center = [Number(lat), Number(lng)];
  const radiusInKm = Number(radiusKm);

  const snapshot = await db.collection(COLLECTION).get();
  const results = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.location) continue;

    const docCenter = [data.location.latitude, data.location.longitude];
    const distanceInKm = distanceBetween(docCenter, center);

    if (distanceInKm <= radiusInKm) {
      results.push({
        ...serialize(doc.id, data),
        distanceKm: Number(distanceInKm.toFixed(3)),
      });
    }
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
};

export const confirmResolution = async (id) => {
  const docRef = db.collection(COLLECTION).doc(id);
  const doc = await docRef.get();

  if (!doc.exists) throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);

  await docRef.update({
    status: COMPLAINT_STATUS.RESOLVED,
    resolvedAt: new Date(),
    resolvedBy: "author",
    updatedAt: new Date(),
  });

  const updatedDoc = await docRef.get();

  return serialize(updatedDoc.id, updatedDoc.data());
};
