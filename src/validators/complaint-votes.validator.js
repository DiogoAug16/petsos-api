import { z } from "zod";
import { voteSchema } from "../schemas/complaint-votes.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateVote = (req, res, next) => {
  const result = voteSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.body.approved = result.data.approved;
  next();
};
