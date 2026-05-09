import { StatusCodes } from "http-status-codes";
import { AppError } from "./app.error.js";
import { ERROR_CODES } from "../types/error.codes.js";

export class InvalidCursorError extends AppError {
  constructor(
    message = "Cursor invalido",
    errorCode = ERROR_CODES.PAGINATION_VALIDATION,
  ) {
    super(message, StatusCodes.BAD_REQUEST, errorCode);
  }
}
