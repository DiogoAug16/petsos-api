import { StatusCodes } from "http-status-codes";
import { AppError } from "./app.error.js";

export class ConflictError extends AppError {
  constructor(message, errorCode = "CONFLICT") {
    super(message, StatusCodes.CONFLICT, errorCode);
  }
}
