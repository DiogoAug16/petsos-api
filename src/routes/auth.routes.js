import { Router } from "express";
import * as authController from "../modules/auth/auth.controller.js";
import * as authValidator from "../validators/auth.validator.js";
import { wrap } from "../shared/utils/async-handler.util.js";

const router = Router();

router.post("/register", authValidator.validateRegister, wrap(authController.register));

router.get(
  "/check-username/:username",
  authValidator.validateCheckUsername,
  wrap(authController.checkUsername),
);

export default router;
