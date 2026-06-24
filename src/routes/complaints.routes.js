import { Router } from "express";
import * as complaintController from "../modules/complaints/complaints.controller.js";
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
  validateNearestQuery,
  validateRequestValidation,
} from "../validators/complaint.validator.js";
import {
  validateSubmitEvidence,
  validateEvidence,
} from "../validators/complaint-evidence.validator.js";
import { validateVote } from "../validators/complaint-votes.validator.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 40,
  keyPrefix: "uploads",
});

const router = Router();

router.post(
  "/",
  authenticateToken,
  uploadRateLimit,
  validateComplaintUploadImages,
  validateCreateComplaint,
  wrap(complaintController.create),
);

router.get("/", validateComplaintsQuery, wrap(complaintController.getAll));

router.get("/map", validateMapQuery, wrap(complaintController.getMapComplaints));

router.get("/nearest", validateNearestQuery, wrap(complaintController.getNearest));

router.use("/:id/comments", commentsRoutes);

router.post(
  "/:id/evidences",
  authenticateToken,
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
  validateEvidence,
  wrap(complaintEvidenceController.validateEvidence),
);

router.post(
  "/:id/votes",
  authenticateToken,
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
  wrap(complaintVotesController.voteEvidenceSelection),
);

router.get(
  "/:id/votes/evidence-selection/status",
  authenticateToken,
  wrap(complaintVotesController.getEvidenceSelectionStatus),
);

router.post(
  "/:id/confirm-resolution",
  authenticateToken,
  wrap(complaintController.confirmResolution),
);

router.post(
  "/:id/request-validation",
  authenticateToken,
  validateRequestValidation,
  wrap(complaintController.requestValidation),
);

router.get("/:id", wrap(complaintController.getDetail));

router.patch(
  "/:id/status",
  authenticateToken,
  validateUpdateStatus,
  wrap(complaintController.updateStatus),
);

router.patch(
  "/:id",
  authenticateToken,
  uploadRateLimit,
  validateComplaintUploadImages,
  validateUpdateComplaint,
  wrap(complaintController.patchComplaint),
);

router.delete("/:id", authenticateToken, wrap(complaintController.deleteComplaint));

export default router;
