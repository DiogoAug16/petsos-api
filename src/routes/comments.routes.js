import { Router } from "express";
import * as commentsController from "../modules/comments/comments.controller.js";
import * as commentRepliesController from "../modules/comment-replies/comment-replies.controller.js";
import * as commentLikesController from "../modules/comment-likes/comment-likes.controller.js";
import * as commentsValidator from "../validators/comment.validator.js";
import * as commentRepliesValidator from "../validators/comment-reply.validator.js";
import * as commentLikesValidator from "../validators/comment-like.validator.js";
import {
  authenticateToken,
  requireVerifiedEmail,
} from "../shared/middlewares/auth.middleware.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";

const router = Router({ mergeParams: true });
const commentReportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyPrefix: "comment_reports",
});

router.post(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  commentsValidator.validateCreateComment,
  wrap(commentsController.create),
);

router.post(
  "/:commentId/replies",
  authenticateToken,
  requireVerifiedEmail,
  commentRepliesValidator.validateCreateCommentReply,
  wrap(commentRepliesController.create),
);

router.post(
  "/:commentId/likes",
  authenticateToken,
  requireVerifiedEmail,
  commentLikesValidator.validateCommentLike,
  wrap(commentLikesController.like),
);

router.post(
  "/:commentId/report",
  authenticateToken,
  requireVerifiedEmail,
  commentReportRateLimit,
  commentsValidator.validateReportComment,
  wrap(commentsController.report),
);

router.delete(
  "/:commentId/likes",
  authenticateToken,
  requireVerifiedEmail,
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
