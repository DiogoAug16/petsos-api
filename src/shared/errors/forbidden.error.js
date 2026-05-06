import { StatusCodes } from "http-status-codes";
import { AppError } from "./app.error.js";
import { ERROR_CODES } from "../types/error.codes.js";

export class ForbiddenError extends AppError {
  constructor(message = "Acesso negado", errorCode = ERROR_CODES.FORBIDDEN) {
    super(message, StatusCodes.FORBIDDEN, errorCode);
  }
}
