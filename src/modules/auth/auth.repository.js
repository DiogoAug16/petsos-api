import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

const USERS_COLLECTION = `${env.firebase.collectionPrefix}users`;
const USERNAMES_COLLECTION = `${env.firebase.collectionPrefix}usernames`;

export async function checkUsernameExists(username) {
  const doc = await db.collection(USERNAMES_COLLECTION).doc(username.toLowerCase()).get();
  return doc.exists;
}

export async function getUserDocument(uid) {
  const doc = await db.collection(USERS_COLLECTION).doc(uid).get();
  return doc.exists ? doc.data() : null;
}

export async function createUserDocument(uid, userData) {
  await db.collection(USERS_COLLECTION).doc(uid).set({
    email: userData.email,
    name: userData.name,
    username: userData.username.toLowerCase(),
    createdAt: new Date().toISOString(),
  });
}

export async function createUsernameDocument(username, uid, email) {
  await db.collection(USERNAMES_COLLECTION).doc(username.toLowerCase()).set({
    email,
    uid,
  });
}
