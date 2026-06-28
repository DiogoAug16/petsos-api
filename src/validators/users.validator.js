import { updateUserProfileSchema } from "../schemas/user.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import { z } from "zod";
import { removeUploadedFiles } from "./upload.validator.js";

export const validateUpdateUserProfile = (req, res, next) => {
  const result = updateUserProfileSchema.safeParse({ body: req.body });

  if (!result.success) {
    removeUploadedFiles(req.file ? [req.file] : []);
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.VALIDATION);
  }

  req.validatedUserProfileData = result.data.body;
  next();
};
