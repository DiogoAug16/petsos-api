import { z } from "zod";
import {
  createCommentSchema,
  deleteCommentSchema,
  getCommentsSchema,
  reportCommentSchema,
} from "../schemas/comment.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateCreateComment = (req, res, next) => {
  const result = createCommentSchema.safeParse({
    params: req.params,
    body: req.body,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedCommentData = {
    complaintId: result.data.params.id,
    ...result.data.body,
  };

  next();
};

export const validateGetComments = (req, res, next) => {
  const result = getCommentsSchema.safeParse({
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedCommentsQuery = {
    complaintId: result.data.params.id,
    ...result.data.query,
  };

  next();
};

export const validateReportComment = (req, res, next) => {
  const result = reportCommentSchema.safeParse({
    params: req.params,
    body: req.body ?? {},
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedCommentReportData = {
    complaintId: result.data.params.id,
    commentId: result.data.params.commentId,
    reason: result.data.body.reason ?? null,
  };

  next();
};

export const validateDeleteComment = (req, res, next) => {
  const result = deleteCommentSchema.safeParse({
    params: req.params,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedDeleteCommentData = {
    complaintId: result.data.params.id,
    commentId: result.data.params.commentId,
  };

  next();
};
