import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { DEFAULT_USER_ROLE } from "../../shared/constants/user-roles.js";

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
  await db
    .collection(USERS_COLLECTION)
    .doc(uid)
    .set({
      email: userData.email,
      name: userData.name,
      username: userData.username.toLowerCase(),

      pushToken: null,

      notificationPreferences: {
        comments: true,
        updates: true,
        statusChanges: true,
      },

      createdAt: new Date().toISOString(),
    });
}

export async function getEmailByUsername(username) {
  const doc = await db.collection(USERNAMES_COLLECTION).doc(username.toLowerCase()).get();
  return doc.exists ? doc.data().email : null;
}

export async function createUsernameDocument(username, uid, email) {
  await db.collection(USERNAMES_COLLECTION).doc(username.toLowerCase()).set({
    email,
    uid,
  });
}

export async function createUserProfileTransaction(uid, userData) {
  const normalizedUsername = userData.username.toLowerCase();
  const userRef = db.collection(USERS_COLLECTION).doc(uid);
  const usernameRef = db.collection(USERNAMES_COLLECTION).doc(normalizedUsername);

  return await db.runTransaction(async (transaction) => {
    const userDoc = await transaction.get(userRef);

    if (userDoc.exists) {
      return {
        created: false,
        user: userDoc.data(),
      };
    }

    const usernameDoc = await transaction.get(usernameRef);

    if (usernameDoc.exists) {
      return {
        usernameTaken: true,
      };
    }

    const user = {
      email: userData.email,
      name: userData.name,
      username: normalizedUsername,

      role: DEFAULT_USER_ROLE,

      pushToken: null,

      notificationPreferences: {
        comments: true,
        updates: true,
        statusChanges: true,
      },

      createdAt: new Date().toISOString(),
    };

    transaction.set(userRef, user);
    transaction.set(usernameRef, {
      email: userData.email,
      uid,
    });

    return {
      created: true,
      user,
    };
  });
}
