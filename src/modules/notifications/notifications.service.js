import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

import * as notificationsRepository from "./notifications.repository.js";

const USERS_COLLECTION = `${env.firebase.collectionPrefix}users`;

/**
 * Cria uma nova notificação para um usuário.
 *
 * Fluxo:
 * - Busca o usuário no Firestore
 * - Verifica preferências de notificação
 * - Cria a notificação no banco
 * - Futuramente poderá enviar push notification
 */
export const createNotification = async ({
  userId,
  complaintId,
  type,
  message,
  sendPush = true,
}) => {
  // Busca dados do usuário
  const userDoc = await db.collection(USERS_COLLECTION).doc(userId).get();

  // Retorna null caso usuário não exista
  if (!userDoc.exists) {
    return null;
  }

  const user = userDoc.data();

  // Preferências de notificação do usuário
  const preferences = user.notificationPreferences || {};

  // Mapeamento dos tipos de notificação
  const typeMap = {
    complaint_update: preferences.updates,
    status_change: preferences.statusChanges,
    new_comment: preferences.comments,
    comment_group: preferences.comments,
  };

  // Verifica se o tipo de notificação está habilitado
  const isEnabled = typeMap[type];

  // Impede criação caso usuário tenha desabilitado
  if (isEnabled === false) {
    return {
      skipped: true,
      reason: "Notification disabled by user preferences",
    };
  }

  // Cria a notificação no Firestore
  const notification = await notificationsRepository.create({
    userId,
    complaintId,
    type,
    message,
  });

  /*
   * TODO: Integrar envio de push notification com Expo Notifications.
   *
   * O push deve ser enviado apenas quando:
   * - sendPush === true
   * - usuário possuir pushToken válido
   * - preferência de notificação estiver habilitada
   *
   * Exemplo futuro:
   *
   * if (sendPush && user.pushToken) {
   *   await sendExpoPushNotification({
   *     to: user.pushToken,
   *     title: "PetSOS",
   *     body: message,
   *   });
   * }
   */

  return {
    ...notification,
    sendPush,
  };
};

/**
 * Retorna todas as notificações do usuário autenticado.
 */
export const getUserNotifications = async (userId) => {
  return await notificationsRepository.findByUserId(userId);
};

/**
 * Marca uma notificação como lida.
 *
 * Valida:
 * - existência da notificação
 * - ownership do usuário autenticado
 */
export const markAsRead = async (notificationId, userId) => {
  // Busca notificação pelo ID
  const notification = await notificationsRepository.findById(notificationId);

  // Valida existência
  if (!notification) {
    throw new Error("Notification not found");
  }

  // Garante que usuário só altere suas próprias notificações
  if (notification.userId !== userId) {
    throw new Error("Unauthorized");
  }

  // Atualiza status para lida
  return await notificationsRepository.markAsRead(notificationId);
};

/**
 * Registra ou atualiza pushToken do usuário.
 *
 * Utilizado futuramente para envio de push notifications.
 */
export const registerPushToken = async (userId, pushToken) => {
  await db.collection(USERS_COLLECTION).doc(userId).update({
    pushToken,
    pushTokenUpdatedAt: new Date(),
  });

  return {
    message: "Push token registrado com sucesso",
  };
};
