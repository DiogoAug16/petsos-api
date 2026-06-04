import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import {
  createComplaintSchema,
  updateComplaintSchema,
  updateStatusSchema,
  nearestQuerySchema,
} from "../schemas/complaint.schema.js";
import { z } from "zod";

export const validateCreateComplaint = (req, res, next) => {
  const data = prepareCreateData(req);

  const result = createComplaintSchema.safeParse(data);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedComplaintData = result.data;
  next();
};

export const validateUpdateComplaint = (req, res, next) => {
  const data = prepareUpdateData(req);

  const result = updateComplaintSchema.safeParse(data);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedComplaintData = result.data;
  next();
};

export const validateUpdateStatus = (req, res, next) => {
  const result = updateStatusSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedStatusData = result.data;
  next();
};

export const validateNearestQuery = (req, res, next) => {
  const result = nearestQuerySchema.safeParse({ query: req.query });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedQuery = result.data.query;
  next();
};

const prepareBaseData = (req) => {
  const body = req.body ?? {};
  const data = { ...body };

  if (body.location) {
    data.location = parseLocation(body.location);
  }

  return data;
};

const prepareCreateData = (req) => {
  const data = prepareBaseData(req);

  if (req.files && req.files.length > 0) {
    data.photos = req.files.map((file) => `/uploads/${file.filename}`);
  } else {
    data.photos = [];
  }

  return data;
};

const prepareUpdateData = (req) => {
  const data = prepareBaseData(req);
  const uploadedPhotos = req.files?.map((file) => `/uploads/${file.filename}`) ?? [];
  const existingPhotos = parsePhotoList(
    data.existingPhotos ?? data["existingPhotos[]"],
    "existingPhotos",
  );

  if (existingPhotos !== undefined || uploadedPhotos.length > 0) {
    data.photos = [...(existingPhotos ?? []), ...uploadedPhotos];
  }

  return data;
};

const parseLocation = (location) => {
  if (typeof location !== "string" || !location.trim()) return location;
  try {
    return JSON.parse(location);
  } catch {
    throw new ValidationError("Localização inválida", ERROR_CODES.COMPLAINT_VALIDATION);
  }
};

const parsePhotoList = (value, fieldName) => {
  if (value === undefined) return undefined;

  if (Array.isArray(value)) {
    return value.map((item) => parsePhotoValue(item, fieldName));
  }

  if (typeof value !== "string") {
    throw new ValidationError(
      `Campo ${fieldName} inválido`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);

      if (!Array.isArray(parsed)) {
        throw new ValidationError(
          `Campo ${fieldName} inválido`,
          ERROR_CODES.COMPLAINT_VALIDATION,
        );
      }

      return parsed.map((item) => parsePhotoValue(item, fieldName));
    } catch {
      throw new ValidationError(
        `Campo ${fieldName} inválido`,
        ERROR_CODES.COMPLAINT_VALIDATION,
      );
    }
  }

  return [trimmed];
};

const parsePhotoValue = (value, fieldName) => {
  if (typeof value !== "string") {
    throw new ValidationError(
      `Campo ${fieldName} inválido`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  const trimmed = value.trim();

  if (!trimmed) {
    throw new ValidationError(
      `Campo ${fieldName} inválido`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  return trimmed;
};
