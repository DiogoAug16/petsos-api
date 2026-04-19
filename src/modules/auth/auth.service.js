import admin from "firebase-admin";
import {
  EmailAlreadyInUseError,
  UsernameAlreadyExistsError,
  WeakPasswordError,
  InvalidEmailError,
  RegistrationFailedError,
} from "../../shared/errors/auth.error.js";
import * as authRepository from "./auth.repository.js";
import logger from "../../logger/index.js";

export async function register(userData) {
  const { email, password, name, username } = userData;

  const usernameExists = await authRepository.checkUsernameExists(username);
  if (usernameExists) {
    throw new UsernameAlreadyExistsError();
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
      throw new EmailAlreadyInUseError();
    }

    if (error.code === "auth/invalid-email") {
      throw new InvalidEmailError();
    }

    if (error.code === "auth/weak-password") {
      throw new WeakPasswordError();
    }

    throw new RegistrationFailedError();
  }
}

export async function checkUsername(username) {
  const exists = await authRepository.checkUsernameExists(username);
  return { available: !exists };
}
