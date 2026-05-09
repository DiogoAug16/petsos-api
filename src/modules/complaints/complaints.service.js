import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { deleteFiles } from "../../shared/helpers/file.helper.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as usersService from "../users/users.service.js";

export const create = async (complaintData, authenticatedUserId) => {
  const complaintId = complaintRepository.createId();

  const complaint = {
    ...complaintData,
    createdById: authenticatedUserId,
    status: COMPLAINT_STATUS.OPEN,
    followersCount: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await Promise.all([
    complaintRepository.create(complaint, complaintId),
    complaintFollowersRepository.createInitialFollower(
      complaintId,
      authenticatedUserId,
      complaint.createdAt,
    ),
  ]);

  return {
    ...complaint,
    id: complaintId,
  };
};

export const getAll = async () => {
  const complaints = await complaintRepository.getAll();
  return await usersService.enrichWithCreatedByUsernames(complaints);
};

export const getDetail = async (id) => {
  const complaint = await complaintRepository.getDetail(id);
  return await usersService.enrichWithCreatedByUsername(complaint);
};

export const patch = async (id, body, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(id);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o criador pode editar esta denuncia");
  }

  const updatedData = {
    ...body,
    updatedAt: new Date(),
  };

  const updated = await complaintRepository.patch(id, updatedData);
  return await usersService.enrichWithCreatedByUsername(updated);
};

export const deleteComplaint = async (id, authenticatedUserId) => {
  const complaint = await complaintRepository.getDetail(id);

  if (complaint.createdById !== authenticatedUserId) {
    throw new ForbiddenError("Apenas o criador pode excluir esta denuncia");
  }

  deleteFiles(complaint.photos);

  await complaintRepository.deleteComplaint(id);
  return { message: "Denuncia excluida com sucesso" };
};

export const findNearestWithinRadius = async ({ lat, lng, radiusKm }) => {
  const complaints = await complaintRepository.findNearestWithinRadius(
    lat,
    lng,
    radiusKm,
  );
  return await usersService.enrichWithCreatedByUsernames(complaints);
};

export const getFollowedByUsername = async (username) => {
  const userId = await usersService.getUidByUsername(username);

  if (!userId) {
    throw new NotFoundError();
  }

  const complaintIds = await complaintFollowersRepository.getComplaintIdsByUserId(userId);

  if (complaintIds.length === 0) return [];

  return await complaintRepository.getByIds(complaintIds);
};
