import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";

import * as notificationsRepository from "./notifications.repository.js";
import * as usersRepository from "../users/users.repository.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";

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
  count = 1,
  grouped = false,
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
    complaint_resolved: preferences.statusChanges,
    new_comment: preferences.comments,
    comment_group: preferences.comments,
    comment_reply: preferences.comments,
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
    count,
    grouped,
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

/**
 * Notifica os seguidores de uma denúncia,
 * exceto o usuário que executou a ação.
 */
export const notifyComplaintFollowers = async ({
  complaintId,
  actorUserId,
  type,
  message,
  sendPush = false,
}) => {
  const followerIds = await complaintFollowersRepository.getFollowers(complaintId);

  const followersToNotify = followerIds.filter(
    (followerId) => followerId !== actorUserId,
  );

  if (type === "new_comment") {
    return await Promise.all(
      followersToNotify.map((followerId) =>
        groupCommentNotification({ userId: followerId, complaintId }),
      ),
    );
  }

  return await Promise.all(
    followersToNotify.map((followerId) =>
      createNotification({
        userId: followerId,
        complaintId,
        type,
        message,
        sendPush,
      }),
    ),
  );
};

/**
 * Agrupa notificação de comentário inline.
 * Se já existe notificação não lida pro mesmo user+complaint,
 * incrementa o contador. Senão, cria nova.
 */
const groupCommentNotification = async ({ userId, complaintId }) => {
  const existing = await notificationsRepository.findUnreadCommentNotification(
    userId,
    complaintId,
  );

  if (existing) {
    const newCount = (existing.count || 1) + 1;
    await notificationsRepository.incrementGroupCount(existing.id, newCount);
    return { id: existing.id, count: newCount, grouped: true };
  }

  return await createNotification({
    userId,
    complaintId,
    type: "new_comment",
    message: "Novo comentário em uma denúncia que você acompanha.",
    sendPush: false,
  });
};
