import pinoHttp from "pino-http";
import { StatusCodes } from "http-status-codes";
import logger from "../logger/index.js";

export const httpLogger = pinoHttp({
  logger,
  customLogLevel: (req, res) => {
    if (res.statusCode >= StatusCodes.INTERNAL_SERVER_ERROR) return "error";
    if (res.statusCode >= StatusCodes.BAD_REQUEST) return "warn";
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
