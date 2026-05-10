import cron from "node-cron";

import * as notificationsRepository from "../modules/notifications/notifications.repository.js";
import * as notificationsService from "../modules/notifications/notifications.service.js";

/**
 * Agrupa notificações de comentários
 * a cada 15 minutos.
 */
export const startNotificationGrouperJob = () => {
  cron.schedule("*/15 * * * *", async () => {
    const notifications =
      await notificationsRepository.findUngroupedCommentNotifications();

    const groups = {};

    for (const notification of notifications) {
      const key = `${notification.userId}_${notification.complaintId}`;

      if (!groups[key]) {
        groups[key] = [];
      }

      groups[key].push(notification);
    }

    for (const group of Object.values(groups)) {
      if (group.length <= 1) {
        continue;
      }

      const firstNotification = group[0];

      await notificationsService.createNotification({
        userId: firstNotification.userId,
        complaintId: firstNotification.complaintId,
        type: "comment_group",
        message: `${group.length} novos comentários em uma denúncia que você acompanha.`,
        sendPush: true,
        count: group.length,
      });

      await notificationsRepository.markAsGrouped(
        group.map((notification) => notification.id),
      );
    }
  });
};
