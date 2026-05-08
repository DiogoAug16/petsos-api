import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const COLLECTION = `${env.firebase.collectionPrefix}notifications`;
const USERS_COLLECTION = `${env.firebase.collectionPrefix}users`;

/**
 * Cria uma nova notificação no Firestore.
 */
export const create = async ({ userId, complaintId, type, message }) => {
  const notificationData = {
    userId,
    complaintId,
    type,
    message,
    read: false,
    grouped: false,
    count: 1,
    createdAt: new Date(),
  };

  const docRef = await db.collection(COLLECTION).add(notificationData);

  return {
    id: docRef.id,
    ...notificationData,
  };
};

/**
 * Busca notificações do usuário autenticado.
 */
export const findByUserId = async (userId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Marca uma notificação como lida.
 */
export const markAsRead = async (notificationId, userId) => {
  const docRef = db.collection(COLLECTION).doc(notificationId);

  const doc = await docRef.get();

  if (!doc.exists) {
    throw new NotFoundError(ERROR_CODES.NOT_FOUND);
  }

  const notification = doc.data();

  if (notification.userId !== userId) {
    throw new ForbiddenError("Você não tem permissão para alterar esta notificação");
  }

  await docRef.update({
    read: true,
    readAt: new Date(),
  });
};

/**
 * Salva o push token do usuário.
 */
export const savePushToken = async ({ userId, pushToken }) => {
  await db.collection(USERS_COLLECTION).doc(userId).set(
    {
      pushToken,
      pushTokenUpdatedAt: new Date(),
    },
    { merge: true },
  );
};
