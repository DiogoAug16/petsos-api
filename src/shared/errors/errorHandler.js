import { AppError } from "./appError.js";
import { InternalServerError } from "./internalServerError.js";

const normalizeError = (err) => {
  if (err instanceof AppError) return err;

  return new InternalServerError(err);
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  const error = normalizeError(err);

  const statusCode = error.statusCode;
  const body = error.getBody();

  res.status(statusCode).send(body);
};
