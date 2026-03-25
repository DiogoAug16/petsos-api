import { AppError } from "./appError.js";
import { ERROR_CODES } from "./errorCodes.js";

export class InternalServerError extends AppError {
  constructor(err) {
    super("Erro interno do servidor", 500, ERROR_CODES.INTERNAL);

    // adicionar um logger depois
    console.log({
      message: err.message,
      stackTrace: err.stack,
      level: "fatal",
    });
  }
}
