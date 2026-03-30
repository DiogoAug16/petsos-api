import { upload } from "../shared/middlewares/upload.middleware.js";
import { ValidationError } from "../shared/errors/validation.error.js";
import { ERROR_CODES } from "../shared/types/error.codes.js";

export const validateUploadImage = (req, res, next) => {
  upload.single("photos")(req, res, (err) => {
    if (err) {
      return next(
        new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR),
      );
    }
    next();
  });
};
