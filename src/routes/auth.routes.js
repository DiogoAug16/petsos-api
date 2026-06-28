import { Router } from "express";
import * as authController from "../modules/auth/auth.controller.js";
import * as authValidator from "../validators/auth.validator.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";
import { wrap } from "../shared/utils/async-handler.util.js";

const router = Router();
const emailValidationRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyPrefix: "auth-email-validation",
});

router.post(
  "/complete-profile",
  authValidator.validateCompleteProfile,
  wrap(authController.completeProfile),
);
router.post(
  "/validate-email",
  emailValidationRateLimit,
  authValidator.validateEmailBody,
  wrap(authController.validateEmail),
);
router.get(
  "/check-username/:username",
  authValidator.validateCheckUsername,
  wrap(authController.checkUsername),
);
router.get(
  "/resolve-username/:username",
  authValidator.validateCheckUsername,
  wrap(authController.resolveUsername),
);

export default router;
