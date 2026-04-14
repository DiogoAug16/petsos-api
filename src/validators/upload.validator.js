import { upload } from "../shared/middlewares/upload.middleware.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";
import logger from "../logger/index.js";

export const validateUploadImage = (req, res, next) => {
  upload.array("photos", 5)(req, res, (err) => {
    if (err) {
      logger.warn({ error: err.message }, "Erro no upload de imagem");
      return next(
        new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR),
      );
    }
    next();
  });
};
