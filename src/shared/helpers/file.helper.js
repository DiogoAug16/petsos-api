import fs from "fs";
import path from "path";
import logger from "../../logger/index.js";

export const deleteFiles = async (filePaths = []) => {
  await Promise.allSettled(
    filePaths.map(async (filePath) => {
      const fileName = path.basename(filePath);
      const fullPath = path.resolve("uploads", fileName);

      try {
        await fs.promises.unlink(fullPath);
        logger.debug({ file: fileName }, "Arquivo deletado");
      } catch (error) {
        if (error.code === "ENOENT") {
          logger.warn({ file: fileName }, "Arquivo não encontrado ao tentar deletar");
          return;
        }
        logger.warn({ file: fileName, error: error.message }, "Erro ao deletar arquivo");
      }
    }),
  );
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
