import { Router } from "express";
import * as complaintController from "../modules/complaints/complaints.controller.js";
import commentsRoutes from "./comments.routes.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { validateUploadImage } from "../validators/upload.validator.js";
import {
  validateCreateComplaint,
  validateUpdateComplaint,
  validateUpdateStatus,
  validateNearestQuery,
} from "../validators/complaint.validator.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticateToken,
  validateUploadImage,
  validateCreateComplaint,
  wrap(complaintController.create),
);

router.get("/", wrap(complaintController.getAll));

router.get("/nearest", validateNearestQuery, wrap(complaintController.getNearest));

router.use("/:id/comments", commentsRoutes);

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
  validateUploadImage,
  validateUpdateComplaint,
  wrap(complaintController.patchComplaint),
);

router.delete("/:id", authenticateToken, wrap(complaintController.deleteComplaint));

export default router;
