import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import {
  createComplaintSchema,
  updateComplaintSchema,
  updateStatusSchema,
  mapQuerySchema,
  mapTileQuerySchema,
  mapTilesBatchSchema,
  mapTilesIndexQuerySchema,
  nearestQuerySchema,
  requestValidationSchema,
} from "../schemas/complaint.schema.js";
import { cursorPaginationQuerySchema } from "../schemas/pagination.schema.js";
import { removeUploadedFiles } from "./upload.validator.js";
import { z } from "zod";

export const validateCreateComplaint = (req, res, next) => {
  const data = prepareCreateData(req);

  const result = createComplaintSchema.safeParse(data);

  if (!result.success) {
    removeUploadedFiles(req.files);
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
    removeUploadedFiles(req.files);
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

export const validateMapQuery = (req, res, next) => {
  const result = mapQuerySchema.safeParse({ query: req.query });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedQuery = result.data.query;
  next();
};

export const validateMapTileQuery = (req, res, next) => {
  const result = mapTileQuerySchema.safeParse({ query: req.query });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedQuery = result.data.query;
  next();
};

export const validateMapTilesBatch = (req, res, next) => {
  const result = mapTilesBatchSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedBody = result.data;
  next();
};

export const validateMapTilesIndexQuery = (req, res, next) => {
  const result = mapTilesIndexQuerySchema.safeParse({ query: req.query });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedQuery = result.data.query;
  next();
};

export const validateComplaintsQuery = (req, res, next) => {
  const result = cursorPaginationQuerySchema.safeParse(req.query);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.PAGINATION_VALIDATION);
  }

  req.validatedQuery = result.data;
  next();
};

export const validateRequestValidation = (req, res, next) => {
  const result = requestValidationSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.validatedValidationRequestData = {
    reasonType: result.data.reasonType,
    reasonText: result.data.reasonText ?? null,
    evidenceIds: result.data.evidenceIds ?? null,
  };
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
  const photos = getUploadedFiles(req, "photos");
  const thumbnailPhotos = getUploadedFiles(req, "thumbnailPhotos");

  if (photos.length > 0) {
    data.photos = photos.map((file) => `/uploads/${file.filename}`);
  } else {
    data.photos = [];
  }

  if (thumbnailPhotos.length > 0) {
    data.thumbnailPhotos = thumbnailPhotos.map((file) => `/uploads/${file.filename}`);
  }

  return data;
};

const prepareUpdateData = (req) => {
  const data = prepareBaseData(req);
  const uploadedPhotos = getUploadedFiles(req, "photos").map(
    (file) => `/uploads/${file.filename}`,
  );
  const uploadedThumbnails = getUploadedFiles(req, "thumbnailPhotos").map(
    (file) => `/uploads/${file.filename}`,
  );
  const existingPhotos = parsePhotoList(
    data.existingPhotos ?? data["existingPhotos[]"],
    "existingPhotos",
  );

  if (existingPhotos !== undefined || uploadedPhotos.length > 0) {
    data.photos = [...(existingPhotos ?? []), ...uploadedPhotos];
  }

  if (uploadedThumbnails.length > 0 && (existingPhotos ?? []).length === 0) {
    data.thumbnailPhotos = uploadedThumbnails;
  }

  return data;
};

const getUploadedFiles = (req, fieldName) => {
  if (Array.isArray(req.files)) return fieldName === "photos" ? req.files : [];
  return Array.isArray(req.files?.[fieldName]) ? req.files[fieldName] : [];
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
