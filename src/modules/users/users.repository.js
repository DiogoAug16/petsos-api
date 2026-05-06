import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

const USERNAMES_COLLECTION = `${env.firebase.collectionPrefix}usernames`;

export async function getUidByUsername(username) {
  const doc = await db.collection(USERNAMES_COLLECTION).doc(username.toLowerCase()).get();

  return doc.exists ? doc.data().uid : null;
}

export async function getUsernameByUid(uid) {
  const snapshot = await db
    .collection(USERNAMES_COLLECTION)
    .where("uid", "==", uid)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  return snapshot.docs[0].id;
}

export async function getUsersByIds(uids) {
  if (!uids?.length) return new Map();

  const uniqueUids = [...new Set(uids)];
  const chunks = [];
  for (let offset = 0; offset < uniqueUids.length; offset += 10) {
    chunks.push(uniqueUids.slice(offset, offset + 10));
  }

  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      db.collection(USERNAMES_COLLECTION).where("uid", "in", chunk).get(),
    ),
  );

  const usersById = new Map(
    snapshots
      .flatMap((snapshot) => snapshot.docs)
      .filter((doc) => doc.data()?.uid)
      .map((doc) => [doc.data().uid, doc.id]),
  );

  return usersById;
}
