import admin from "firebase-admin";
import {
  UsernameAlreadyExistsError,
  UnauthorizedError,
} from "../../shared/errors/auth.error.js";
import * as authRepository from "./auth.repository.js";
import { assertEmailCanReceiveMessages } from "./email-validation.service.js";
import logger from "../../logger/index.js";
import {
  createTimer,
  getEmailDomain,
  roundDurationMs,
} from "../../shared/utils/log.util.js";

export async function completeProfile(idToken, profileData) {
  const getDurationMs = createTimer();
  const { name, username } = profileData;

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(idToken);
  } catch (error) {
    logger.error({ error: error.message }, "Token inválido");
    throw new UnauthorizedError();
  }

  const uid = decodedToken.uid;
  const email = decodedToken.email || (await admin.auth().getUser(uid)).email;
  await assertEmailCanReceiveMessages(email);

  const result = await authRepository.createUserProfileTransaction(uid, {
    email,
    name,
    username,
  });

  if (result.usernameTaken) {
    throw new UsernameAlreadyExistsError();
  }

  if (!result.created) {
    logger.info(
      {
        event: "auth.complete_profile.existing",
        uid,
        durationMs: roundDurationMs(getDurationMs()),
      },
      "Perfil já existe, retornando dados",
    );
    return {
      uid,
      email: result.user.email,
      displayName: result.user.name,
    };
  }

  logger.info(
    {
      event: "auth.complete_profile.created",
      uid,
      emailDomain: getEmailDomain(email),
      durationMs: roundDurationMs(getDurationMs()),
    },
    "Perfil completado com sucesso",
  );

  return {
    uid,
    email,
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

export async function validateEmail(email) {
  return await assertEmailCanReceiveMessages(email);
}
