import { Router } from "express";
import * as commentsController from "../modules/comments/comments.controller.js";
import * as commentRepliesController from "../modules/comment-replies/comment-replies.controller.js";
import * as commentLikesController from "../modules/comment-likes/comment-likes.controller.js";
import * as commentsValidator from "../validators/comment.validator.js";
import * as commentRepliesValidator from "../validators/comment-reply.validator.js";
import * as commentLikesValidator from "../validators/comment-like.validator.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";
import { wrap } from "../shared/utils/async-handler.util.js";

const router = Router({ mergeParams: true });

router.post(
  "/",
  authenticateToken,
  commentsValidator.validateCreateComment,
  wrap(commentsController.create),
);

router.post(
  "/:commentId/replies",
  authenticateToken,
  commentRepliesValidator.validateCreateCommentReply,
  wrap(commentRepliesController.create),
);

router.post(
  "/:commentId/likes",
  authenticateToken,
  commentLikesValidator.validateCommentLike,
  wrap(commentLikesController.like),
);

router.delete(
  "/:commentId/likes",
  authenticateToken,
  commentLikesValidator.validateCommentLike,
  wrap(commentLikesController.unlike),
);

router.get(
  "/:commentId/replies",
  authenticateToken,
  commentRepliesValidator.validateGetCommentReplies,
  wrap(commentRepliesController.getByCommentId),
);

router.get(
  "/",
  authenticateToken,
  commentsValidator.validateGetComments,
  wrap(commentsController.getByComplaintId),
);

export default router;
