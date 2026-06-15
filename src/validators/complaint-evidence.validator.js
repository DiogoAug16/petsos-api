import { z } from "zod";
import {
  submitEvidenceSchema,
  validateEvidenceSchema,
} from "../schemas/complaint-evidence.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateSubmitEvidence = (req, res, next) => {
  const result = submitEvidenceSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  if (!req.files || req.files.length === 0) {
    throw new ValidationError(
      "É obrigatório enviar pelo menos 1 foto como evidência",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (req.files.length > 5) {
    throw new ValidationError(
      "Máximo de 5 fotos permitidas",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  next();
};

export const validateEvidence = (req, res, next) => {
  const result = validateEvidenceSchema.safeParse(req.body);

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMPLAINT_VALIDATION);
  }

  req.body.approved = result.data.approved;
  req.body.evidenceIds = result.data.evidenceIds;
  next();
};
