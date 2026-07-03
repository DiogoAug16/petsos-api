import { Router } from "express";
import * as complaintController from "../modules/complaints/complaints.controller.js";
import * as complaintModerationsController from "../modules/complaint-moderations/complaint-moderations.controller.js";
import * as complaintEvidenceController from "../modules/complaint-evidence/complaint-evidence.controller.js";
import * as complaintVotesController from "../modules/complaint-votes/complaint-votes.controller.js";
import * as complaintValidationsController from "../modules/complaint-validations/complaint-validations.controller.js";
import commentsRoutes from "./comments.routes.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import {
  validateComplaintUploadImages,
  validateUploadImage,
} from "../validators/upload.validator.js";
import {
  validateCreateComplaint,
  validateComplaintsQuery,
  validateUpdateComplaint,
  validateUpdateStatus,
  validateMapQuery,
  validateMapTileQuery,
  validateMapTilesBatch,
  validateMapTilesIndexQuery,
  validateNearestQuery,
  validateModerationAction,
  validateReportComplaint,
  validateRequestValidation,
} from "../validators/complaint.validator.js";
import {
  validateSubmitEvidence,
  validateEvidence,
} from "../validators/complaint-evidence.validator.js";
import { validateVote } from "../validators/complaint-votes.validator.js";
import {
  authenticateToken,
  requireVerifiedEmail,
} from "../shared/middlewares/auth.middleware.js";
import { USER_ROLES } from "../shared/constants/user-roles.js";
import { authorizeRoles } from "../shared/middlewares/authorize-roles.middleware.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  keyPrefix: "uploads",
});

const reportRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyPrefix: "complaint_reports",
});

const router = Router();

router.post(
  "/",
  authenticateToken,
  requireVerifiedEmail,
  uploadRateLimit,
  validateComplaintUploadImages,
  validateCreateComplaint,
  wrap(complaintController.create),
);

router.get("/", validateComplaintsQuery, wrap(complaintController.getAll));

router.get(
  "/moderation/pending",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  validateComplaintsQuery,
  wrap(complaintModerationsController.getPending),
);

router.get(
  "/admin",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  validateComplaintsQuery,
  wrap(complaintController.getAdminAll),
);

router.get(
  "/admin/:id",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  wrap(complaintController.getAdminDetail),
);

router.post(
  "/map/tiles/batch",
  validateMapTilesBatch,
  wrap(complaintController.getMapTilesBatch),
);

router.get(
  "/map/tiles-index",
  validateMapTilesIndexQuery,
  wrap(complaintController.getMapTilesIndex),
);

router.get(
  "/map/tile",
  validateMapTileQuery,
  wrap(complaintController.getMapTileComplaints),
);

router.get("/map", validateMapQuery, wrap(complaintController.getMapComplaints));

router.get("/nearest", validateNearestQuery, wrap(complaintController.getNearest));

router.use("/:id/comments", commentsRoutes);

router.post(
  "/:id/evidences",
  authenticateToken,
  requireVerifiedEmail,
  uploadRateLimit,
  validateUploadImage,
  validateSubmitEvidence,
  wrap(complaintEvidenceController.submitEvidence),
);

router.get(
  "/:id/validations/count",
  wrap(complaintValidationsController.countByComplaintId),
);

router.get("/:id/evidences", wrap(complaintEvidenceController.getByComplaintId));

router.post(
  "/:id/evidences/validate",
  authenticateToken,
  requireVerifiedEmail,
  validateEvidence,
  wrap(complaintEvidenceController.validateEvidence),
);

router.post(
  "/:id/votes",
  authenticateToken,
  requireVerifiedEmail,
  validateVote,
  wrap(complaintVotesController.vote),
);

router.get(
  "/:id/votes/status",
  authenticateToken,
  wrap(complaintVotesController.getStatus),
);

router.post(
  "/:id/votes/evidence-selection",
  authenticateToken,
  requireVerifiedEmail,
  wrap(complaintVotesController.voteEvidenceSelection),
);

router.get(
  "/:id/votes/evidence-selection/status",
  authenticateToken,
  wrap(complaintVotesController.getEvidenceSelectionStatus),
);

router.post(
  "/:id/report",
  authenticateToken,
  requireVerifiedEmail,
  reportRateLimit,
  validateReportComplaint,
  wrap(complaintModerationsController.reportComplaint),
);

router.patch(
  "/:id/moderation/approve",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  validateModerationAction,
  wrap(complaintModerationsController.approve),
);

router.patch(
  "/:id/moderation/reject",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  validateModerationAction,
  wrap(complaintModerationsController.reject),
);

router.patch(
  "/:id/moderation/hide",
  authenticateToken,
  requireVerifiedEmail,
  authorizeRoles(USER_ROLES.ADMIN),
  validateModerationAction,
  wrap(complaintModerationsController.hide),
);

router.post(
  "/:id/confirm-resolution",
  authenticateToken,
  requireVerifiedEmail,
  wrap(complaintController.confirmResolution),
);

router.post(
  "/:id/request-validation",
  authenticateToken,
  requireVerifiedEmail,
  validateRequestValidation,
  wrap(complaintController.requestValidation),
);

router.get("/:id", wrap(complaintController.getDetail));

router.patch(
  "/:id/status",
  authenticateToken,
  requireVerifiedEmail,
  validateUpdateStatus,
  wrap(complaintController.updateStatus),
);

router.patch(
  "/:id",
  authenticateToken,
  requireVerifiedEmail,
  uploadRateLimit,
  validateComplaintUploadImages,
  validateUpdateComplaint,
  wrap(complaintController.patchComplaint),
);

router.delete(
  "/:id",
  authenticateToken,
  requireVerifiedEmail,
  wrap(complaintController.deleteComplaint),
);

export default router;
