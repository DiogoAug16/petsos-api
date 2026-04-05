import { AppError } from "./app.error.js";
import { ERROR_CODES } from "../types/error.codes.js";
import logger from "../../logger/index.js";

export class InternalServerError extends AppError {
  constructor(err) {
    super("Erro interno do servidor", 500, ERROR_CODES.INTERNAL);

    logger.fatal(
      {
        message: err.message,
        stack: err.stack,
      },
      "Erro interno não tratado",
    );
  }
}
