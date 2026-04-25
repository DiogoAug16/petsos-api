import admin from "firebase-admin";
import {
  UsernameAlreadyExistsError,
  UnauthorizedError,
} from "../../shared/errors/auth.error.js";
import * as authRepository from "./auth.repository.js";
import logger from "../../logger/index.js";

export async function completeProfile(idToken, profileData) {
  const { name, username } = profileData;

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.error({ error: error.message }, "Token inválido");
    throw new UnauthorizedError();
  }

  const uid = decodedToken.uid;

  const existingUser = await authRepository.getUserDocument(uid);
  if (existingUser) {
    logger.info({ uid }, "Perfil já existe, retornando dados");
    return {
      uid,
      email: existingUser.email,
      displayName: existingUser.name,
    };
  }

  const usernameExists = await authRepository.checkUsernameExists(username);
  if (usernameExists) {
    throw new UsernameAlreadyExistsError();
  }

  const userRecord = await admin.auth().getUser(uid);

  await authRepository.createUserDocument(uid, {
    email: userRecord.email,
    name,
    username,
  });

  await authRepository.createUsernameDocument(username, uid, userRecord.email);

  logger.info({ uid, email: userRecord.email }, "Perfil completado com sucesso");

  return {
    uid,
    email: userRecord.email,
    displayName: name,
  };
}

export async function resolveUsername(username) {
  const email = await authRepository.getEmailByUsername(username);
  return { email };
}

export async function checkUsername(username) {
  const exists = await authRepository.checkUsernameExists(username);
  return { available: !exists };
}
