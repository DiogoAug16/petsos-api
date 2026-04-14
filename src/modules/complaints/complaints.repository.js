import { db, GeoPoint } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { serialize } from "../../shared/utils/firestore.util.js";
import { distanceBetween } from "geofire-common";

const COLLECTION = `${env.firebase.collectionPrefix}complaints`;

const toGeoPoint = (data) => {
  if (!data.location) return data;
  const { latitude, longitude } = data.location;
  return { ...data, location: new GeoPoint(latitude, longitude) };
};

export const create = async (data) => {
  const prepared = toGeoPoint(data);

  console.log("Prepared:", prepared);
  console.log("Location:", prepared.location);
  console.log("É GeoPoint?", prepared.location instanceof GeoPoint);
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

// Busca denúncias próximas a uma coordenada dentro de um raio em quilômetros.
// Exemplo de como usar abaixo:
//http://localhost:3000/api/complaints/nearest?lat=-15.622433350841794&lng=-56.17044635117054&radiusKm=5

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
