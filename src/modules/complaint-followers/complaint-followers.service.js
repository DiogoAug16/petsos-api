import * as complaintFollowersRepository from "./complaint-followers.repository.js";

export const follow = async ({ complaintId, userId }) => {
  await complaintFollowersRepository.follow(complaintId, userId);

  return {
    message: "Denúncia adicionada aos acompanhamentos com sucesso",
  };
};

export const unfollow = async ({ complaintId, userId }) => {
  await complaintFollowersRepository.unfollow(complaintId, userId);

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
  return await complaintFollowersRepository.getFollowers(complaintId);
};

export const isFollowing = async ({ complaintId, userId }) => {
  const following = await complaintFollowersRepository.isFollowing(complaintId, userId);

  return {
    complaintId,
    isFollowing: following,
  };
};
