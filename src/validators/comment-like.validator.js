import { z } from "zod";
import { commentLikeSchema } from "../schemas/comment-like.schema.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateCommentLike = (req, res, next) => {
  const result = commentLikeSchema.safeParse({
    params: req.params,
  });

  if (!result.success) {
    const errors = z.flattenError(result.error);
    throw new ValidationError(errors, ERROR_CODES.COMMENT_VALIDATION);
  }

  req.validatedCommentLikeData = {
    complaintId: result.data.params.id,
    commentId: result.data.params.commentId,
  };

  next();
};
