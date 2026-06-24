import { Router } from "express";
import { z } from "zod";
import * as routesService from "../modules/routes/routes.service.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { success } from "../shared/utils/response.util.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";

const router = Router();

const coordinateSchema = z
  .string()
  .regex(/^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/)
  .transform((value) => {
    const [longitude, latitude] = value.split(",").map(Number);
    return { longitude, latitude };
  })
  .refine(
    ({ longitude, latitude }) =>
      longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90,
    "Coordenada inválida",
  );

const querySchema = z.object({
  start: coordinateSchema,
  end: coordinateSchema,
});

router.get(
  "/driving",
  rateLimit({ windowMs: 60 * 1000, max: 30, keyPrefix: "routes" }),
  wrap(async (req, res) => {
    const result = querySchema.safeParse(req.query);

    if (!result.success) {
      throw new ValidationError(z.flattenError(result.error), ERROR_CODES.VALIDATION);
    }

    const coordinates = await routesService.getDrivingRoute(result.data);
    return success(res, { coordinates });
  }),
);

export default router;
