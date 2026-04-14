import { GeoPoint } from "../../config/firebase.js";

const transformValue = (value) => {
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof GeoPoint)
    return { latitude: value.latitude, longitude: value.longitude };
  return value;
};

export const serialize = (id, data) => ({
  id,
  ...Object.fromEntries(
    Object.entries(data).map(([key, value]) => [key, transformValue(value)]),
  ),
});
