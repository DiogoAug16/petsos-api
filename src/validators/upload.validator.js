import { upload } from "../shared/middleware/upload.middleware.js";
import { ValidationError } from "../shared/errors/validationError.js";

export const validateUploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return next(new ValidationError("Erro ao fazer upload da imagem", ERROR_CODES.UPLOAD_ERROR));
    }
    next();
  });
};
