import multer from "multer";
import path from "path";
import { UPLOADS_DIR } from "../../config/storage.js";
import logger from "../../logger/index.js";

// configuração de armazenamento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() +
      "-" +
      Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);

    logger.debug(
      { filename: uniqueName, originalname: file.originalname },
      "Upload de arquivo",
    );
    cb(null, uniqueName);
  },
});

// filtro de tipo de arquivo
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    logger.warn(
      { mimetype: file.mimetype, filename: file.originalname },
      "Tipo de arquivo rejeitado",
    );
    cb(new Error("Apenas imagens JPG e PNG são permitidas"), false);
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
});

export const complaintUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
});

export default multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
    files: 5,
  },
});
