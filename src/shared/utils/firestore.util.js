import admin from "firebase-admin";
import { GeoPoint } from "../../config/firebase.js";

const transformValue = (value) => {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof GeoPoint)
    return { latitude: value.latitude, longitude: value.longitude };
  return value;
};

export const timestampToMillis = (timestamp) => {
  if (typeof timestamp?.toMillis !== "function") {
    throw new TypeError("Esperado Firestore Timestamp");
  }

  return timestamp.toMillis();
};

export const millisToTimestamp = (milliseconds) =>
  admin.firestore.Timestamp.fromMillis(milliseconds);

export const serialize = (id, data) => ({
  id,
  ...Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, transformValue(value)]),
  ),
});
