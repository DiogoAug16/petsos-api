import { ValidationError } from "../shared/errors/validationError.js";
import { ERROR_CODES } from "../shared/errors/errorCodes.js";
import {
  createComplaintSchema,
  updateComplaintSchema,
} from "../schemas/complaint.schema.js";
import { z } from "zod";

export const validateCreateComplaint = (req, res, next) => {
  const data = prepareData(req);

  const result = createComplaintSchema.safeParse(data);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedComplaintData = result.data;
  next();
};

export const validateUpdateComplaint = (req, res, next) => {
  const data = prepareData(req);

  const result = updateComplaintSchema.safeParse(data);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedComplaintData = result.data;
  next();
};

const prepareData = (req) => {
  const body = req.body ?? {};
  const data = { ...body };

  if (body.location) {
    data.location = parseLocation(body.location);
  }

  if (req.file) {
    data.photos = [`/uploads/${req.file.filename}`];
  }

  return data;
};

const parseLocation = (location) => {
  if (typeof location !== "string" || !location.trim()) return location;
  try {
    return JSON.parse(location);
  } catch {
    throw new ValidationError("Location inválido", ERROR_CODES.COMPLAINT_VALIDATION);
  }
};
