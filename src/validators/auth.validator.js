import {
  completeProfileSchema,
  checkUsernameSchema,
  validateEmailSchema,
} from "../schemas/auth.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import { z } from "zod";

export const validateCompleteProfile = (req, res, next) => {
  const result = completeProfileSchema.safeParse({ body: req.body });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Dados inválidos",
      errors: result.error.errors.map((err) => ({
        field: err.path[1],
        message: err.message,
      })),
    });
  }

  req.validatedAuthData = result.data.body;
  next();
};

export const validateCheckUsername = (req, res, next) => {
  const result = checkUsernameSchema.safeParse({ params: req.params });

  if (!result.success) {
    return res.status(400).json({
      success: false,
      message: "Username inválido",
    });
  }

  next();
};

export const validateEmailBody = (req, res, next) => {
  const result = validateEmailSchema.safeParse({ body: req.body });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.INVALID_EMAIL);
  }

  req.validatedEmailData = result.data.body;
  next();
};

export const validateUsernameParam = (req, res, next) => {
  const result = checkUsernameSchema.safeParse({ params: req.params });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.VALIDATION);
  }

  req.validatedParams = result.data.params;
  next();
};
