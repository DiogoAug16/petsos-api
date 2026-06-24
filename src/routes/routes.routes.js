import { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import { wrap } from "../shared/utils/async-handler.util.js";
import { success } from "../shared/utils/response.util.js";
import { rateLimit } from "../shared/middlewares/rate-limit.middleware.js";

const router = Router();
const ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car";
const ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const ROUTE_CACHE_MAX_ITEMS = 500;
const routeCache = new Map();

const roundCoordinate = (value) => Number(value).toFixed(5);

const getRouteCacheKey = ({ start, end }) =>
  [
    roundCoordinate(start.longitude),
    roundCoordinate(start.latitude),
    roundCoordinate(end.longitude),
    roundCoordinate(end.latitude),
  ].join(",");

const getCachedRoute = (key) => {
  const cached = routeCache.get(key);
  if (!cached || cached.expiresAt <= Date.now()) {
    routeCache.delete(key);
    return null;
  }

  return cached.coordinates;
};

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

    if (!env.openRouteService.apiKey) {
      return success(res, { coordinates: [] });
    }

    const cacheKey = getRouteCacheKey(result.data);
    const cachedCoordinates = getCachedRoute(cacheKey);
    if (cachedCoordinates) {
      return success(res, { coordinates: cachedCoordinates });
    }

    const params = new URLSearchParams({
      api_key: env.openRouteService.apiKey,
      geometry_simplify: "false",
      start: `${result.data.start.longitude},${result.data.start.latitude}`,
      end: `${result.data.end.longitude},${result.data.end.latitude}`,
    });

    const response = await fetch(`${ORS_DIRECTIONS_URL}?${params}`, {
      headers: {
        Accept: "application/json, application/geo+json",
        Authorization: env.openRouteService.apiKey,
      },
    });

    if (!response.ok) {
      return success(res, { coordinates: [] });
    }

    const data = await response.json();
    const coordinates = data?.features?.[0]?.geometry?.coordinates;
    const safeCoordinates = Array.isArray(coordinates) ? coordinates : [];
    if (routeCache.size >= ROUTE_CACHE_MAX_ITEMS) {
      routeCache.delete(routeCache.keys().next().value);
    }
    routeCache.set(cacheKey, {
      coordinates: safeCoordinates,
      expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
    });

    return success(res, {
      coordinates: safeCoordinates,
    });
  }),
);

export default router;
