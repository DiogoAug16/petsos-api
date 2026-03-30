import { AppError } from "./app.error.js";
import { ERROR_CODES } from "../types/error.codes.js";

export class NotFoundError extends AppError {
  constructor(code = ERROR_CODES.NOT_FOUND) {
    super("Recurso não encontrado", 404, code);
  }
}
