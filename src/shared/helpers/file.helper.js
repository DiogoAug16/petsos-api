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

export const getDirectorySizeBytesAsync = async (dirPath) => {
  let total = 0;
  const pending = [dirPath];

  while (pending.length) {
    const currentPath = pending.pop();

    try {
      const entries = await fs.promises.readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(currentPath, entry.name);

        if (entry.isDirectory()) {
          pending.push(entryPath);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.promises.stat(entryPath);
            total += stats.size;
          } catch (error) {
            logger.debug(
              { path: entryPath, error: error.message },
              "Arquivo ignorado ao medir uploads",
            );
          }
        }
      }
    } catch (error) {
      logger.warn({ path: currentPath, error: error.message }, "Erro ao medir uploads");
    }
  }

  return total;
};
