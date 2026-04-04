import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
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
  // Alteração para multiplas fotos
  if (req.files && req.files.length > 0) {
    data.photos = req.files.map((file) => `/uploads/${file.filename}`);
  } else {
    data.photos = [];
  }

  return data;
};

const parseLocation = (location) => {
  try {
    const parsed = typeof location === "string" ? JSON.parse(location) : location;

    const { latitude, longitude } = parsed || {};

    if (typeof latitude !== "number" || typeof longitude !== "number") {
      throw new Error();
    }

    return { latitude, longitude };
  } catch {
    throw new ValidationError("Localização inválida", ERROR_CODES.COMPLAINT_VALIDATION);
  }
};
