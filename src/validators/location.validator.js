import { z } from "zod";
import { citySearchQuerySchema } from "../schemas/location.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateCitySearchQuery = (req, res, next) => {
  const result = citySearchQuerySchema.safeParse({ query: req.query });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.VALIDATION);
  }

  req.validatedQuery = result.data.query;
  next();
};
