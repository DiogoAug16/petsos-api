import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { deleteFiles } from "../../shared/helpers/upload.helper.js";

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
