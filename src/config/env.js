import dotenv from "dotenv";
dotenv.config();

const numberFromEnv = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isDev: process.env.NODE_ENV === "development",
  firebase: {
    collectionPrefix: process.env.FIREBASE_COLLECTION_PREFIX || "",
    projectId: process.env.FIREBASE_PROJECT_ID,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  },
  openRouteService: {
    apiKey: process.env.OPENROUTESERVICE_API_KEY,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || null,
  },
  uploads: {
    maxBytes: numberFromEnv(process.env.UPLOADS_MAX_BYTES, 2 * 1024 * 1024 * 1024),
  },
};
