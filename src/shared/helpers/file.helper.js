import fs from "fs";
import path from "path";
import logger from "../../logger/index.js";

export const deleteFiles = (filePaths = []) => {
  for (const filePath of filePaths) {
    const fileName = path.basename(filePath);
    const fullPath = path.resolve("uploads", fileName);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      logger.debug({ file: fileName }, "Arquivo deletado");
    } else {
      logger.warn({ file: fileName }, "Arquivo não encontrado ao tentar deletar");
    }
  }
};
