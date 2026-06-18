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
 * Remove todas as notificações do usuário autenticado.
 */
export const clearUserNotifications = async (userId) => {
  let deletedCount = 0;

  while (true) {
    const snapshot = await db
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .limit(500)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += snapshot.size;
  }

  return deletedCount;
};

/**
 * Remove todas as notificações vinculadas a uma denúncia.
 */
export const clearByComplaintId = async (complaintId) => {
  let deletedCount = 0;

  while (true) {
    const snapshot = await db
      .collection(COLLECTION)
      .where("complaintId", "==", complaintId)
      .limit(500)
      .get();

    if (snapshot.empty) break;

    const batch = db.batch();

    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += snapshot.size;
  }

  return deletedCount;
};

/**
 * Busca notificação de comentário não lida para agrupamento inline.
 */
export const findUnreadCommentNotification = async (userId, complaintId) => {
  const snapshot = await db
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("complaintId", "==", complaintId)
    .where("type", "in", ["new_comment", "comment_group"])
    .where("read", "==", false)
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

/**
 * Atualiza notificação existente para agrupar novo comentário.
 */
export const incrementGroupCount = async (notificationId, newCount) => {
  const docRef = db.collection(COLLECTION).doc(notificationId);

  await docRef.update({
    type: "comment_group",
    message: `${newCount} novos comentários em uma denúncia que você acompanha.`,
    count: newCount,
    grouped: true,
    createdAt: new Date(),
  });
};
