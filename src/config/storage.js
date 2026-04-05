import fs from "fs";
import path from "path";
import logger from "../logger/index.js";

export const UPLOADS_DIR = path.resolve("uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  logger.info("Pasta uploads/ criada com sucesso");
}
