import { AppError } from "./app.error.js";
import { ERROR_CODES } from "../types/error.codes.js";

export class ValidationError extends AppError {
  constructor(
    errors,
    code = ERROR_CODES.VALIDATION,
    message = "Dados de entrada inválidos",
  ) {
    super(message, 400, code);
    this.errors =
      typeof errors === "string" ? { formErrors: [errors], fieldErrors: {} } : errors;
  }

  getBody() {
    return {
      ...super.getBody(),
      errors: this.errors.fieldErrors,
    };
  }
}
