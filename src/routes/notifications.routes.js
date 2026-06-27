import { Router } from "express";

import {
  authenticateToken,
  requireVerifiedEmail,
} from "../shared/middlewares/auth.middleware.js";
import { wrap } from "../shared/utils/async-handler.util.js";

import {
  validateNotificationIdParam,
  validateRegisterPushToken,
} from "../validators/notifications.validator.js";

import * as notificationsController from "../modules/notifications/notifications.controller.js";

const router = Router();

/**
 * GET /notifications
 * Lista as notificações do usuário autenticado.
 */
router.get(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  wrap(notificationsController.getUserNotifications),
);

/**
 * DELETE /notifications
 * Remove todas as notificações do usuário autenticado.
 */
router.delete(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  wrap(notificationsController.clearUserNotifications),
);

/**
 * Retorna a quantidade de notificações não lidas
 * do usuário autenticado.
 */
router.get(
  "/unread-count",
  authenticateToken,
  requireVerifiedEmail,
  notificationsController.countUnread,
);

/**
 * PATCH /notifications/:id/read
 * Marca uma notificação como lida.
 */
router.patch(
  "/:id/read",
  authenticateToken,
  requireVerifiedEmail,
  validateNotificationIdParam,
  wrap(notificationsController.markAsRead),
);

/**
 * POST /notifications/register-token
 * Registra o push token do dispositivo do usuário.
 */
router.post(
  "/register-token",
  authenticateToken,
  requireVerifiedEmail,
  validateRegisterPushToken,
  wrap(notificationsController.registerPushToken),
);

router.post(
  "/test",
  authenticateToken,
  requireVerifiedEmail,
  wrap(notificationsController.createTestNotification),
);

export default router;
