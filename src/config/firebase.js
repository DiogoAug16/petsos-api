import admin from "firebase-admin";
import { env } from "./env.js";
import logger from "../logger/index.js";

function initFirebase() {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: env.firebase.projectId,
        privateKey: env.firebase.privateKey,
        clientEmail: env.firebase.clientEmail,
      }),
    });

    logger.info("Firebase conectado com sucesso");

    return {
      db: admin.firestore(),
      GeoPoint: admin.firestore.GeoPoint,
      FieldValue: admin.firestore.FieldValue,
    };
  } catch (error) {
    logger.fatal({ error: error.message }, "Falha ao conectar com Firebase");
    process.exit(1);
  }
}

export const { db, GeoPoint, FieldValue } = initFirebase();
