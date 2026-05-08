import * as complaintRepository from "./complaints.repository.js";
import { COMPLAINT_STATUS } from "../../shared/types/complaint.status.js";
import { deleteFiles } from "../../shared/helpers/file.helper.js";
import { ForbiddenError } from "../../shared/errors/forbidden.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as usersRepository from "../users/users.repository.js";

const enrichWithCreator = async (complaints) => {
  if (complaints.length === 0) return [];

  const creatorIds = complaints.map((complaint) => complaint.createdById).filter(Boolean);
  const usersById = await usersRepository.getUsersByIds(creatorIds);

  return complaints.map((complaint) => ({
    ...complaint,
    createdByUsername: usersById.get(complaint.createdById) ?? null,
  }));
};

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
  return await enrichWithCreator(complaints);
};

export const getDetail = async (id) => {
  const complaint = await complaintRepository.getDetail(id);
  const [enriched] = await enrichWithCreator([complaint]);
  return enriched;
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
  const [enriched] = await enrichWithCreator([updated]);
  return enriched;
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
  return await enrichWithCreator(complaints);
};

export const getAssumedByUsername = async (username) => {
  const userId = await usersRepository.getUidByUsername(username);

  if (!userId) {
    throw new NotFoundError();
  }

  const complaintIds = await complaintFollowersRepository.getComplaintIdsByUserId(userId);

  if (complaintIds.length === 0) return [];

  return await complaintRepository.getByIds(complaintIds);
};
