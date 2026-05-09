import { z } from "zod";
import {
  createCommentReplySchema,
  getCommentRepliesSchema,
} from "../schemas/comment-reply.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateCreateCommentReply = (req, res, next) => {
  const result = createCommentReplySchema.safeParse({
    params: req.params,
    body: req.body,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedCommentData = {
    complaintId: result.data.params.id,
    commentId: result.data.params.commentId,
    ...result.data.body,
  };

  next();
};

export const validateGetCommentReplies = (req, res, next) => {
  const result = getCommentRepliesSchema.safeParse({
    params: req.params,
    query: req.query,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedCommentRepliesQuery = {
    complaintId: result.data.params.id,
    commentId: result.data.params.commentId,
    ...result.data.query,
  };

  next();
};
