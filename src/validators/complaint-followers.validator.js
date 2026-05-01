import { z } from "zod";
import {
  followComplaintSchema,
  complaintIdParamSchema,
} from "../schemas/complaint-followers.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateFollowComplaint = (req, res, next) => {
  const result = followComplaintSchema.safeParse({ body: req.body });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedFollowData = result.data.body;
  next();
};

export const validateComplaintIdParam = (req, res, next) => {
  const result = complaintIdParamSchema.safeParse({ params: req.params });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  next();
};
