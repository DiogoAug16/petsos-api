import { AppError } from "./appError.js";
import { ERROR_CODES } from "./errorCodes.js";

export class ValidationError extends AppError {
  constructor(message = "Dados de entrada inválidos", code = ERROR_CODES.VALIDATION) {
    super(message, 400, code);
  }
}
