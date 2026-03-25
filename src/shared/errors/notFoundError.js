import { AppError } from "./appError.js";
import { ERROR_CODES } from "./errorCodes.js";

export class NotFoundError extends AppError {
  constructor(code = ERROR_CODES.NOT_FOUND) {
    super("Recurso não encontrado", 404, code);
  }
}
