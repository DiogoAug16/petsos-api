import admin from "firebase-admin";
import { AppError } from "../../shared/errors/app.error.js";
import { StatusCodes } from "http-status-codes";
import * as authRepository from "./auth.repository.js";
import logger from "../../logger/index.js";

export async function register(userData) {
  const { email, password, name, username } = userData;

  const usernameExists = await authRepository.checkUsernameExists(username);
  if (usernameExists) {
    throw new AppError(
      "Este username já está em uso",
      StatusCodes.CONFLICT,
      "USERNAME_ALREADY_EXISTS",
    );
  }

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    await authRepository.createUserDocument(userRecord.uid, {
      email,
      name,
      username,
    });

    await authRepository.createUsernameDocument(username, userRecord.uid, email);

    const customToken = await admin.auth().createCustomToken(userRecord.uid);

    logger.info({ uid: userRecord.uid, email }, "Usuário criado com sucesso");

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      customToken,
    };
  } catch (error) {
    logger.error({ error: error.message }, "Erro ao criar usuário");

    if (error.code === "auth/email-already-exists") {
      throw new AppError(
        "Este email já está cadastrado",
        StatusCodes.CONFLICT,
        "EMAIL_ALREADY_IN_USE",
      );
    }

    if (error.code === "auth/invalid-email") {
      throw new AppError("Email inválido", StatusCodes.BAD_REQUEST, "INVALID_EMAIL");
    }

    if (error.code === "auth/weak-password") {
      throw new AppError("Senha muito fraca", StatusCodes.BAD_REQUEST, "WEAK_PASSWORD");
    }

    throw new AppError(
      "Erro ao criar conta",
      StatusCodes.INTERNAL_SERVER_ERROR,
      "REGISTRATION_FAILED",
    );
  }
}

export async function checkUsername(username) {
  const exists = await authRepository.checkUsernameExists(username);
  return { available: !exists };
}
