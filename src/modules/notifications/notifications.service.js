import * as notificationsRepository from "./notifications.repository.js";

/**
 * Cria uma nova notificação para o usuário.
 */
export const createNotification = async ({
  userId,
  complaintId,
  type,
  message,
  sendPush = true,
}) => {
  const notification = await notificationsRepository.create({
    userId,
    complaintId,
    type,
    message,
  });

  // O envio de push será integrado depois.
  // Por enquanto, o parâmetro sendPush já fica preparado.
  return {
    ...notification,
    sendPush,
  };
};

/**
 * Busca as notificações do usuário autenticado.
 */
export const getUserNotifications = async (userId) => {
  return await notificationsRepository.findByUserId(userId);
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
 * Salva o push token do usuário.
 */
export const registerPushToken = async ({ userId, pushToken }) => {
  await notificationsRepository.savePushToken({
    userId,
    pushToken,
  });

  return {
    message: "Push token registrado com sucesso",
  };
};
