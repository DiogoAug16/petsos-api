import { z } from "zod";

import {
  notificationIdParamSchema,
  registerPushTokenSchema,
} from "../schemas/notifications.schema.js";

import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

/**
 * Valida o id da notificação enviado na rota.
 */
export const validateNotificationIdParam = (req, res, next) => {
  const result = notificationIdParamSchema.safeParse({
    params: req.params,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);

    throw new ValidationError(errors, ERROR_CODES.VALIDATION);
  }

  next();
};

/**
 * Valida o pushToken enviado pelo aplicativo.
 */
export const validateRegisterPushToken = (req, res, next) => {
  const result = registerPushTokenSchema.safeParse({
    body: req.body,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);

    throw new ValidationError(errors, ERROR_CODES.VALIDATION);
  }

  next();
};
