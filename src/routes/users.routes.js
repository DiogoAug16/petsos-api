import { Router } from "express";
import * as usersController from "../modules/users/users.controller.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { validateUsernameParam } from "../validators/auth.validator.js";

const router = Router();

router.get(
  "/:username/followed-complaints",
  validateUsernameParam,
  wrap(usersController.getFollowedComplaints),
);

export default router;
