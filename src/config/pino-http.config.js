import pinoHttp from "pino-http";
import logger from "../logger/index.js";

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res) => {
    if (res.statusCode >= 500) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.originalUrl} - ${res.statusCode}`;
  },
  customErrorMessage: (req, res) => {
    return `${req.method} ${req.originalUrl} - ${res.statusCode}`;
  },
  customProps: (req, res) => ({
    responseTime: res.responseTime,
  }),
});
