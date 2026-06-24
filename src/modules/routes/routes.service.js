import { StatusCodes } from "http-status-codes";
import { env } from "../../config/env.js";
import { AppError } from "../../shared/errors/app.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import logger from "../../logger/index.js";

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

const setCachedRoute = (key, coordinates) => {
  if (routeCache.size >= ROUTE_CACHE_MAX_ITEMS) {
    routeCache.delete(routeCache.keys().next().value);
  }

  routeCache.set(key, {
    coordinates,
    expiresAt: Date.now() + ROUTE_CACHE_TTL_MS,
  });
};

const unavailable = (message, statusCode = StatusCodes.BAD_GATEWAY) =>
  new AppError(message, statusCode, ERROR_CODES.ROUTE_SERVICE_UNAVAILABLE);

export const getDrivingRoute = async ({ start, end }) => {
  if (!env.openRouteService.apiKey) {
    throw unavailable(
      "OPENROUTESERVICE_API_KEY não configurada no backend",
      StatusCodes.SERVICE_UNAVAILABLE,
    );
  }

  const cacheKey = getRouteCacheKey({ start, end });
  const cachedCoordinates = getCachedRoute(cacheKey);
  if (cachedCoordinates) return cachedCoordinates;

  const params = new URLSearchParams({
    geometry_simplify: "false",
    start: `${start.longitude},${start.latitude}`,
    end: `${end.longitude},${end.latitude}`,
  });

  const response = await fetch(`${ORS_DIRECTIONS_URL}?${params}`, {
    headers: {
      Accept: "application/json, application/geo+json",
      Authorization: env.openRouteService.apiKey,
    },
  });

  if (!response.ok) {
    logger.warn(
      { status: response.status, statusText: response.statusText },
      "OpenRouteService recusou a rota",
    );
    throw unavailable("Serviço de rota indisponível");
  }

  const data = await response.json();
  const coordinates = data?.features?.[0]?.geometry?.coordinates;
  const safeCoordinates = Array.isArray(coordinates) ? coordinates : [];

  setCachedRoute(cacheKey, safeCoordinates);
  return safeCoordinates;
};
