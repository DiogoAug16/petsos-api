import { ValidationError } from "../shared/errors/validationError.js";
import { ERROR_CODES } from "../shared/errors/errorCodes.js";

export const prepareComplaintData = (req, res, next) => {
  const data = { ...req.body };

  if (req.body.location) {
    data.location = parseLocation(req.body.location);
  }

  if (req.file) {
    data.photos = [`/uploads/${req.file.filename}`];
  } else if (req.method === "POST") {
    data.photos = [];
  }

  req.validatedComplaintData = data;
  next();
};

const parseLocation = (location) => {
  if (typeof location !== "string" || !location.trim()) return location;
  try {
    return JSON.parse(location);
  } catch {
    throw new ValidationError("Location inválido", ERROR_CODES.COMPLAINT_VALIDATION);
  }
};
