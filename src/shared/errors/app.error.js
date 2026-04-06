import { StatusCodes } from "http-status-codes";

export class AppError extends Error {
  constructor(message, statusCode = StatusCodes.INTERNAL_SERVER_ERROR, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  getBody() {
    return {
      success: false,
      message: this.message,
      errorCode: this.errorCode,
    };
  }
}
