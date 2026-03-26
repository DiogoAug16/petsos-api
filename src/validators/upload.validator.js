import { upload } from "../shared/middleware/upload.middleware.js";
import { ValidationError } from "../shared/errors/validationError.js";
import { ERROR_CODES } from "../shared/errors/errorCodes.js";

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
