import "./src/config/env.js";
import "./src/config/storage.js";
import express from "express";
import cors from "cors";
import routes from "./src/routes/index.js";
import { errorHandler } from "./src/shared/middlewares/error.middleware.js";
import { httpLogger } from "./src/config/pino-http.config.js";
import logger from "./src/logger/index.js";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(httpLogger);

app.use("/uploads", express.static("uploads"));
app.use("/api", routes);

app.use(errorHandler);

const server = app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
});

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
