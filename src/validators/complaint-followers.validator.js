import { z } from "zod";
import { complaintIdParamSchema } from "../schemas/complaint-followers.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateComplaintIdParam = (req, res, next) => {
  const result = complaintIdParamSchema.safeParse({ params: req.params });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  next();
};
