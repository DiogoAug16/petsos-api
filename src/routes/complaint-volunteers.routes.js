import { Router } from "express";
import * as complaintVolunteersController from "../modules/complaint-volunteers/complaint-volunteers.controller.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import {
  authenticateToken,
  requireVerifiedEmail,
} from "../shared/middlewares/auth.middleware.js";
import { validateComplaintIdParam } from "../validators/complaint-followers.validator.js";

const router = Router();

router.post(
  "/:complaintId",
  authenticateToken,
  requireVerifiedEmail,
  validateComplaintIdParam,
  wrap(complaintVolunteersController.volunteer),
);

router.get(
  "/:complaintId/me",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintVolunteersController.isVolunteer),
);

router.delete(
  "/:complaintId",
  authenticateToken,
  requireVerifiedEmail,
  validateComplaintIdParam,
  wrap(complaintVolunteersController.unvolunteer),
);

router.get(
  "/:complaintId/count",
  validateComplaintIdParam,
  wrap(complaintVolunteersController.count),
);

router.get(
  "/:complaintId",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintVolunteersController.listByComplaint),
);

export default router;
