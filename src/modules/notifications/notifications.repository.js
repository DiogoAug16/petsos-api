import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

const COLLECTION = `${env.firebase.collectionPrefix}notifications`;

/**
 * Cria uma nova notificação no Firestore.
 */
export const create = async ({
  userId,
  complaintId,
  type,
  message,
  count = 1,
  grouped = false,
}) => {
  const notificationData = {
    userId,
    complaintId,
    type,
    message,
    read: false,
    grouped,
    count,
    createdAt: new Date(),
  };

  const docRef = await db.collection(COLLECTION).add(notificationData);

  return {
    id: docRef.id,
    ...notificationData,
  };
};

/**
 * Busca notificações do usuário autenticado,
 * ordenadas da mais recente para a mais antiga.
 */
export const getUserNotifications = async (userId) => {
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
 * Alias temporário para manter compatibilidade com código antigo.
 */
export const findByUserId = getUserNotifications;

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
 * Retorna a quantidade de notificações não lidas do usuário.
 */
export const countUnread = async (userId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("read", "==", false)
    .get();

  return snapshot.size;
};

/**
 * Busca notificações não lidas e não agrupadas
 * criadas nos últimos 15 minutos para agrupamento.
 */
export const getPendingGroupable = async (userId, complaintId, type) => {
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("complaintId", "==", complaintId)
    .where("type", "==", type)
    .where("read", "==", false)
    .where("grouped", "==", false)
    .where("createdAt", ">=", fifteenMinutesAgo)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Marca notificações como agrupadas utilizando batch update.
 */
export const markAsGrouped = async (notificationIds) => {
  const batch = db.batch();

  notificationIds.forEach((id) => {
    const ref = db.collection(COLLECTION).doc(id);

    batch.update(ref, {
      grouped: true,
    });
  });

  await batch.commit();
};

/**
 * Busca notificações de comentários não agrupadas
 * para o job de agrupamento.
 */
export const findUngroupedCommentNotifications = async () => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("type", "==", "new_comment")
    .where("grouped", "==", false)
    .where("read", "==", false)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
