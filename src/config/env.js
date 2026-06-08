import dotenv from "dotenv";
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV === "development",
  firebase: {
    collectionPrefix: process.env.FIREBASE_COLLECTION_PREFIX || "",
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  complaints: {
    minValidationsAutoResolve: parseInt(
      process.env.MIN_VALIDATIONS_AUTO_RESOLVE || "1",
      10,
    ),
  },
};
