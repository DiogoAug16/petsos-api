import { Router } from "express";
import * as locationsController from "../modules/locations/locations.controller.js";
import { validateCitySearchQuery } from "../validators/location.validator.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";
import { wrap } from "../shared/utils/async-handler.util.js";

const router = Router();
const citySearchRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyPrefix: "location-cities",
});

router.get(
  "/cities",
  authenticateToken,
  citySearchRateLimit,
  validateCitySearchQuery,
  wrap(locationsController.searchCities),
);

export default router;
