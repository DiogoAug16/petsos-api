import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_TYPES } from "../../shared/types/complaintTypes.js";
import { ValidationError } from "../../shared/errors/validationError.js";
import { NotFoundError } from "../../shared/errors/notFoundError.js";
import { ERROR_CODES } from "../../shared/errors/errorCodes.js";

export const create = async ({ title, description, location, type, photos }) => {
  const missingFields = [];
  const validTypes = Object.values(COMPLAINT_TYPES);

  if (!title) missingFields.push("title");
  if (!description) missingFields.push("description");
  if (!location) missingFields.push("location");
  if (!type) missingFields.push("type");
  if (!location.latitude) missingFields.push("location.latitude");
  if (!location.longitude) missingFields.push("location.longitude");

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION
    );
  }

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION
    );
  }

  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Tipo inválido. Valores aceitos: ${validTypes.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION
    );
  }

  const complaint = {
    title,
    description,
    type,
    location,
    status: "open",
    photos: photos || [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return await complaintRepository.create(complaint);
};

export const getAll = async () => {
  return await complaintRepository.getAll();
};

export const getDetail = async (id) => {
  return await complaintRepository.getDetail(id);
};

export const deleteComplaint = async (id) => {
  const complaint = await complaintRepository.getDetail(id);

  if (!complaint) {
    throw new NotFoundError(ERROR_CODES.COMPLAINT_NOT_FOUND);
  }

  await complaintRepository.deleteComplaint(id);
  return { message: "Denúncia excluída com sucesso" };
};
