import { Router } from "express";
import * as complaintFollowersController from "../modules/complaint-followers/complaint-followers.controller.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";
import { validateComplaintIdParam } from "../validators/complaint-followers.validator.js";

const router = Router();

router.post(
  "/:complaintId",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintFollowersController.follow),
);

router.get(
  "/:complaintId/me",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintFollowersController.isFollowing),
);

router.delete(
  "/:complaintId",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintFollowersController.unfollow),
);

router.get(
  "/:complaintId/count",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintFollowersController.count),
);

router.get(
  "/:complaintId",
  authenticateToken,
  validateComplaintIdParam,
  wrap(complaintFollowersController.listByComplaint),
);

export default router;
