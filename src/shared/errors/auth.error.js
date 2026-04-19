import { StatusCodes } from "http-status-codes";
import { AppError } from "./app.error.js";
import { ERROR_CODES } from "../types/error.codes.js";

export class EmailAlreadyInUseError extends AppError {
  constructor() {
    super(
      "Este email já está cadastrado",
      StatusCodes.CONFLICT,
      ERROR_CODES.EMAIL_ALREADY_IN_USE,
    );
  }
}

export class UsernameAlreadyExistsError extends AppError {
  constructor() {
    super(
      "Este username já está em uso",
      StatusCodes.CONFLICT,
      ERROR_CODES.USERNAME_ALREADY_EXISTS,
    );
  }
}

export class WeakPasswordError extends AppError {
  constructor() {
    super("Senha muito fraca", StatusCodes.BAD_REQUEST, ERROR_CODES.WEAK_PASSWORD);
  }
}

export class InvalidEmailError extends AppError {
  constructor() {
    super("Email inválido", StatusCodes.BAD_REQUEST, ERROR_CODES.INVALID_EMAIL);
  }
}

export class RegistrationFailedError extends AppError {
  constructor() {
    super(
      "Erro ao criar conta",
      StatusCodes.INTERNAL_SERVER_ERROR,
      ERROR_CODES.REGISTRATION_FAILED,
    );
  }
}
