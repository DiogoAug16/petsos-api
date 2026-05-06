import { Router } from "express";
import * as complaintController from "../modules/complaints/complaints.controller.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { validateUploadImage } from "../validators/upload.validator.js";
import { validateCreateComplaint, validateUpdateComplaint, validateNearestQuery } from "../validators/complaint.validator.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";

const router = Router();

router.post(
  "/",
  authenticateToken,
  validateUploadImage,
  validateCreateComplaint,
  wrap(complaintController.create)
);

router.get(
  "/",
  wrap(complaintController.getAll)
);

router.get(
  "/nearest",
  validateNearestQuery,
  wrap(complaintController.getNearest)
);

router.get(
  "/:id",
  wrap(complaintController.getDetail)
);

router.patch(
  "/:id",
  validateUploadImage,
  validateUpdateComplaint,
  wrap(complaintController.patchComplaint)
);

router.delete(
  "/:id",
  authenticateToken,
  wrap(complaintController.deleteComplaint)
);

export default router;
