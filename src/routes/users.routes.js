import { Router } from "express";
import * as usersController from "../modules/users/users.controller.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { validateUsernameParam } from "../validators/auth.validator.js";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../shared/middlewares/auth.middleware.js";
import { validateUpdateUserProfile } from "../validators/users.validator.js";
import { validateProfilePhotoUpload } from "../validators/upload.validator.js";

const router = Router();

router.get("/me", authenticateToken, wrap(usersController.getMe));
router.get("/me/summary", authenticateToken, wrap(usersController.getMeSummary));

router.patch(
  "/me",
  authenticateToken,
  validateProfilePhotoUpload,
  validateUpdateUserProfile,
  wrap(usersController.updateMe),
);

router.get(
  "/:username/followed-complaints/summary",
  optionalAuthenticateToken,
  validateUsernameParam,
  wrap(usersController.getFollowedComplaintsSummary),
);

router.get(
  "/:username/followed-complaints",
  optionalAuthenticateToken,
  validateUsernameParam,
  wrap(usersController.getFollowedComplaints),
);

router.get(
  "/:username/profile-summary",
  optionalAuthenticateToken,
  validateUsernameParam,
  wrap(usersController.getPublicProfileSummary),
);

router.get("/:username", validateUsernameParam, wrap(usersController.getPublicProfile));

export default router;
