import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

import * as notificationsRepository from "./notifications.repository.js";
import * as usersRepository from "../users/users.repository.js";

const USERS_COLLECTION = `${env.firebase.collectionPrefix}users`;

/**
 * Cria uma nova notificação para um usuário.
 */
export const createNotification = async ({
  userId,
  complaintId,
  type,
  message,
  sendPush = true,
}) => {
  const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  const user = userDoc.data();
  const preferences = user.notificationPreferences || {};

  const typeMap = {
    complaint_update: preferences.updates,
    status_change: preferences.statusChanges,
    new_comment: preferences.comments,
    comment_group: preferences.comments,
  };

  const isEnabled = typeMap[type];

  if (isEnabled === false) {
    return {
      skipped: true,
      reason: "Notification disabled by user preferences",
    };
  }

  const notification = await notificationsRepository.create({
    userId,
    complaintId,
    type,
    message,
  });

  return {
    ...notification,
    sendPush,
  };
};

/**
 * Retorna todas as notificações do usuário autenticado.
 */
export const getUserNotifications = async (userId) => {
  return await notificationsRepository.getUserNotifications(userId);
};

/**
 * Marca uma notificação como lida.
 */
export const markAsRead = async ({ notificationId, userId }) => {
  await notificationsRepository.markAsRead(notificationId, userId);

  return {
    id: notificationId,
    read: true,
    message: "Notificação marcada como lida com sucesso",
  };
};

/**
 * Registra ou atualiza pushToken do usuário.
 */
export const registerPushToken = async ({ userId, pushToken }) => {
  await usersRepository.updatePushToken(userId, pushToken);

  return {
    message: "Push token registrado com sucesso",
  };
};

export const countUnread = async (userId) => {
  const count = await notificationsRepository.countUnread(userId);

  return {
    count,
  };
};
