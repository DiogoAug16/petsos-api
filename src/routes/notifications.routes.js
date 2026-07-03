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

import { USER_ROLES } from "../shared/constants/user-roles.js";
import { authorizeRoles } from "../shared/middlewares/authorize-roles.middleware.js";

const router = Router();

/**
 * GET /notifications
 * Lista as notificações do usuário autenticado.
 */
router.get("/", authenticateToken, wrap(notificationsController.getUserNotifications));

/**
 * DELETE /notifications
 * Remove todas as notificações do usuário autenticado.
 */
router.delete(
  "/",
  authenticateToken,
  wrap(notificationsController.clearUserNotifications),
);

/**
 * Retorna a quantidade de notificações não lidas
 * do usuário autenticado.
 */
router.get("/unread-count", authenticateToken, notificationsController.countUnread);

/**
 * PATCH /notifications/:id/read
 * Marca uma notificação como lida.
 */
router.patch(
  "/:id/read",
  authenticateToken,
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
  validateRegisterPushToken,
  wrap(notificationsController.registerPushToken),
);

router.post(
  "/test",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  wrap(notificationsController.createTestNotification),
);

export default router;
