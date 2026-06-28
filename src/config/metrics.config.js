import client from "prom-client";
import { StatusCodes } from "http-status-codes";
import { env } from "./env.js";

const register = new client.Registry();

client.collectDefaultMetrics({
  register,
  prefix: "petsos_",
});

const requestDuration = new client.Histogram({
  name: "petsos_http_request_duration_seconds",
  help: "Duração das requests HTTP em segundos",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
});

const requestTotal = new client.Counter({
  name: "petsos_http_requests_total",
  help: "Total de requests HTTP",
  labelNames: ["method", "route", "status_code"],
});

register.registerMetric(requestDuration);
register.registerMetric(requestTotal);

const normalizeRoute = (req) => {
  if (req.route?.path) {
    const basePath = req.baseUrl || "";
    const routePath = Array.isArray(req.route.path) ? req.route.path[0] : req.route.path;
    return `${basePath}${routePath}`;
  }

  return req.path || req.originalUrl || "unknown";
};

export const metricsMiddleware = (req, res, next) => {
  const endTimer = requestDuration.startTimer();

  res.on("finish", () => {
    const labels = {
      method: req.method,
      route: normalizeRoute(req),
      status_code: String(res.statusCode),
    };

    requestTotal.inc(labels);
    endTimer(labels);
  });

  next();
};

export const metricsHandler = async (req, res) => {
  if (env.metrics.token) {
    const token = req.headers.authorization?.replace("Bearer ", "");
    if (token !== env.metrics.token) {
      return res.status(StatusCodes.UNAUTHORIZED).type("text/plain").send("Unauthorized");
    }
  }

  res.set("Content-Type", register.contentType);
  return res.send(await register.metrics());
};
