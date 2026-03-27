import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_TYPES } from "../../shared/types/complaint.types.js";
import { COMPLAINT_STATUS } from "./../../shared/types/complaint.status.js";
import { ValidationError } from "../../shared/errors/validationError.js";
import { ERROR_CODES } from "../../shared/errors/errorCodes.js";
import { COMPLAINT_FIELDS } from "../../shared/types/complaint.fields.js";
import { COMPLAINT_ANIMALS } from "../../shared/types/complaint.animals.js";
import fs from "fs";
import path from "path";

export const create = async ({
  title,
  description,
  location,
  type,
  animal,
  photos,
  status = COMPLAINT_STATUS.OPEN,
}) => {
  const missingFields = [];
  const validTypes = Object.values(COMPLAINT_TYPES);
  const validStatuses = Object.values(COMPLAINT_STATUS);
  const validAnimals = Object.values(COMPLAINT_ANIMALS);

  if (!title) missingFields.push("title");
  if (!description) missingFields.push("description");
  if (!location) missingFields.push("location");
  if (!type) missingFields.push("type");
  if (!location.latitude) missingFields.push("location.latitude");
  if (!location.longitude) missingFields.push("location.longitude");
  if (!animal) missingFields.push("animal");

  if (missingFields.length > 0) {
    throw new ValidationError(
      `Campos obrigatórios faltando: ${missingFields.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (!validTypes.includes(type)) {
    throw new ValidationError(
      `Tipo inválido. Valores aceitos: ${validTypes.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (!validStatuses.includes(status)) {
    throw new ValidationError(
      `Status inválido. Valores aceitos: ${validStatuses.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (animal && !validAnimals.includes(animal)) {
    throw new ValidationError(
      `Animal inválido. Valores aceitos: ${validAnimals.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  const complaint = {
    title,
    description,
    type,
    animal,
    location,
    status,
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

export const patch = async (id, body) => {
  const validTypes = Object.values(COMPLAINT_TYPES);
  const validStatuses = Object.values(COMPLAINT_TYPES);
  const validAnimals = Object.values(COMPLAINT_ANIMALS);
  const allowedFields = Object.values(COMPLAINT_FIELDS);

  console.log("body recebido:", body);
  console.log("campos do body:", Object.keys(body));
  console.log("campos permitidos:", Object.values(COMPLAINT_FIELDS));

  if (Object.keys(body).length === 0) {
    throw new ValidationError(
      "Nenhum campo para atualizar",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (!Object.keys(body).every((field) => allowedFields.includes(field))) {
    throw new Error(`Existem campos inválidos para atualizar`);
  }

  if (body.type && !validTypes.includes(body.type)) {
    throw new ValidationError(
      "Existem campos inválidos para atualizar",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (body.location) {
    if (body.location.latitude === undefined || body.location.longitude === undefined) {
      throw new ValidationError(
        "Location deve conter latitude e longitude",
        ERROR_CODES.COMPLAINT_VALIDATION,
      );
    }
  }

  if (body.status && !validStatuses.includes(body.status)) {
    throw new ValidationError(
      `Status inválido. Valores aceitos: ${validStatuses.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  if (body.animal && !validAnimals.includes(body.animal)) {
    throw new ValidationError(
      `Animal inválido. Valores aceitos: ${validAnimals.join(", ")}`,
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  const complaint = {
    ...body,
    updatedAt: new Date(),
  };

  return await complaintRepository.patch(id, complaint);
};

// remover denúncia do banco e fotos do disco
export const deleteComplaint = async (id) => {
  const complaint = await complaintRepository.getDetail(id);

  if (!complaint) {
    throw new ValidationError(
      "Denúncia não encontrada",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  // remover fotos do disco
  if (complaint.photos && complaint.photos.length > 0) {
    for (const photo of complaint.photos) {
      const fileName = path.basename(photo);
      const filePath = path.resolve("uploads", fileName);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
  }
  // remover do banco
  await complaintRepository.deleteComplaint(id);
  return { message: "Denúncia excluída com sucesso" };
};
