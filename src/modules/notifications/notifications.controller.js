import { StatusCodes } from "http-status-codes";

import * as notificationsService from "./notifications.service.js";

import { success } from "../../shared/utils/response.util.js";

/**
 * Controller responsável por retornar as notificações
 * do usuário autenticado.
 */
export const getUserNotifications = async (req, res) => {
  const notifications = await notificationsService.getUserNotifications(req.userId);

  return success(res, notifications, StatusCodes.OK);
};

/**
 * Controller responsável por marcar uma notificação
 * como lida.
 */
export const markAsRead = async (req, res) => {
  const notification = await notificationsService.markAsRead({
    notificationId: req.params.id,
    userId: req.userId,
  });

  return success(res, notification, StatusCodes.OK);
};

/**
 * Controller responsável por registrar
 * o push token do usuário.
 */
export const registerPushToken = async (req, res) => {
  const result = await notificationsService.registerPushToken({
    userId: req.userId,
    pushToken: req.body.pushToken,
  });

  return success(res, result, StatusCodes.OK);
};
