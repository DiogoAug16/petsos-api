import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { distanceBetween } from "geofire-common";

const USERNAMES_COLLECTION = `${env.firebase.collectionPrefix}usernames`;
const USERS_COLLECTION = `${env.firebase.collectionPrefix}users`;

export async function getUidByUsername(username) {
  const doc = await db.collection(USERNAMES_COLLECTION).doc(username.toLowerCase()).get();

  return doc.exists ? doc.data().uid : null;
}

export async function getUsernameByUid(uid) {
  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();

  return doc.exists ? (doc.data().username ?? null) : null;
}

export async function getUserById(uid) {
  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();

  return doc.exists ? doc.data() : null;
}

export async function getUserByUsername(username) {
  const uid = await getUidByUsername(username);

  if (!uid) return null;

  return await getUserById(uid);
}

/**
 * Retorna um Map<uid, username>.
 */
export async function getUsersByIds(uids) {
  if (!uids?.length) return new Map();

  const uniqueUids = [...new Set(uids)];
  const refs = uniqueUids.map((uid) => db.collection(USERS_COLLECTION).doc(uid));
  const chunks = [];

  for (let offset = 0; offset < refs.length; offset += 100) {
    chunks.push(refs.slice(offset, offset + 100));
  }

  const snapshots = await Promise.all(chunks.map((chunk) => db.getAll(...chunk)));

  const usersById = new Map(
    snapshots
      .flat()
      .filter((doc) => doc.exists && doc.data()?.username)
      .map((doc) => [doc.id, doc.data().username]),
  );

  return usersById;
}

/**
 * Atualiza o push token do usuário.
 */
export async function updatePushToken(userId, pushToken) {
  await db.collection(USERS_COLLECTION).doc(userId).set(
    {
      pushToken,
      pushTokenUpdatedAt: new Date(),
    },
    { merge: true },
  );
}

/**
 * Busca dados completos dos usuários pelos ids.
 */
export async function getUserProfilesByIds(userIds) {
  if (!userIds?.length) return [];

  const uniqueUserIds = [...new Set(userIds)];

  const refs = uniqueUserIds.map((userId) => db.collection(USERS_COLLECTION).doc(userId));

  const snapshots = await db.getAll(...refs);

  return snapshots
    .filter((doc) => doc.exists)
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
}

export async function findNearestWithinRadius(lat, lng, radiusKm) {
  const center = [Number(lat), Number(lng)];
  const radiusInKm = Number(radiusKm);

  const snapshot = await db.collection(USERS_COLLECTION).get();
  const results = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (!data.location) continue;

    const userCenter = [data.location.latitude, data.location.longitude];
    const distanceInKm = distanceBetween(userCenter, center);

    if (distanceInKm <= radiusInKm) {
      results.push({
        id: doc.id,
        ...data,
        distanceKm: Number(distanceInKm.toFixed(3)),
      });
    }
  }

  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
}
