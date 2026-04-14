import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { deleteFiles } from "../../shared/helpers/file.helper.js";
import { ValidationError } from "../../shared/errors/validation.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";

export const create = async (complaintData) => {
  const complaint = {
    ...complaintData,
    status: COMPLAINT_STATUS.OPEN,
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
  const complaint = {
    ...body,
    updatedAt: new Date(),
  };

  return await complaintRepository.patch(id, complaint);
};

export const deleteComplaint = async (id) => {
  const complaint = await complaintRepository.getDetail(id);

  deleteFiles(complaint.photos);

  await complaintRepository.deleteComplaint(id);
  return { message: "Denúncia excluída com sucesso" };
};

export const findNearestWithinRadius = async ({ lat, lng, radiusKm }) => {
  if (!lat || !lng || !radiusKm) {
    throw new ValidationError(
      "Parâmetros obrigatórios: lat, lng, radiusKm",
      ERROR_CODES.COMPLAINT_VALIDATION,
    );
  }

  const parsedLat = Number(lat);
  const parsedLng = Number(lng);
  const parsedRadiusKm = Number(radiusKm);

  if (
    Number.isNaN(parsedLat) ||
    Number.isNaN(parsedLng) ||
    Number.isNaN(parsedRadiusKm)
  ) {
    throw new ValidationError("Parâmetros inválidos", ERROR_CODES.COMPLAINT_VALIDATION);
  }

  return await complaintRepository.findNearestWithinRadius(
    parsedLat,
    parsedLng,
    parsedRadiusKm,
  );
};
