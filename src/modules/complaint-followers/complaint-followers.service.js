import * as complaintFollowersRepository from "./complaint-followers.repository.js";

export const follow = async ({ complaintId, userId }) => {
  return await complaintFollowersRepository.create({
    complaintId,
    userId,
    createdAt: new Date(),
  });
};

export const unfollow = async ({ complaintId, userId }) => {
  await complaintFollowersRepository.remove({ complaintId, userId });

  return {
    message: "Denúncia removida dos acompanhamentos com sucesso",
  };
};

export const count = async (complaintId) => {
  const total = await complaintFollowersRepository.countByComplaintId(complaintId);

  return {
    complaintId,
    totalFollowers: total,
  };
};

export const listByComplaint = async (complaintId) => {
  return await complaintFollowersRepository.findByComplaintId(complaintId);
};
