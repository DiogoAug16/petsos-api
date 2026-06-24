import "./src/config/storage.js";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import routes from "./src/routes/index.js";
import { env } from "./src/config/env.js";
import { errorHandler } from "./src/shared/middlewares/error.middleware.js";
import { rateLimit } from "./src/shared/middlewares/rate-limit.middleware.js";
import { httpLogger } from "./src/config/pino-http.config.js";
import logger from "./src/logger/index.js";
import { setupMapTileRealtime } from "./src/modules/map-tiles/map-tiles.realtime.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors(env.cors.origin ? { origin: env.cors.origin } : undefined));
app.use(express.json({ limit: "1mb" }));
app.use(httpLogger);

app.use(
  "/uploads",
  express.static("uploads", {
    dotfiles: "deny",
    immutable: true,
    maxAge: "7d",
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
    },
  }),
);
app.use("/api", rateLimit({ windowMs: 60 * 1000, max: 300, keyPrefix: "api" }));
app.use("/api", routes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
});

setupMapTileRealtime(server);

server.keepAliveTimeout = 120 * 1000;
server.headersTimeout = 121 * 1000;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    logger.fatal({ port: PORT }, "Porta já está em uso");
  } else {
    logger.fatal({ error: error.message }, "Erro ao iniciar servidor");
  }
  process.exit(1);
});
