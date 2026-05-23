import * as complaintVolunteersRepository from "./complaint-volunteers.repository.js";
import * as complaintFollowersRepository from "../complaint-followers/complaint-followers.repository.js";
import * as usersService from "../users/users.service.js";
import * as notificationsService from "../notifications/notifications.service.js";

export const volunteer = async ({ complaintId, userId }) => {
  await complaintVolunteersRepository.volunteer(complaintId, userId);

  const alreadyFollowing = await complaintFollowersRepository.isFollowing(
    complaintId,
    userId,
  );
  if (!alreadyFollowing) {
    await complaintFollowersRepository.follow(complaintId, userId);
  }

  await notificationsService.notifyComplaintFollowers({
    complaintId,
    actorUserId: userId,
    type: "complaint_volunteer",
    message: "Alguém se voluntariou para resolver uma denúncia que você acompanha.",
    sendPush: true,
  });

  return {
    message: "Voluntariado confirmado com sucesso",
  };
};

export const unvolunteer = async ({ complaintId, userId }) => {
  await complaintVolunteersRepository.unvolunteer(complaintId, userId);

  return {
    message: "Você deixou de ser voluntário nesta denúncia",
  };
};

export const count = async (complaintId) => {
  const total = await complaintVolunteersRepository.countByComplaintId(complaintId);

  return {
    complaintId,
    totalVolunteers: total,
  };
};

export const listByComplaint = async (complaintId) => {
  const volunteerUserIds = await complaintVolunteersRepository.getVolunteers(complaintId);
  const usersById = await usersService.getUsernamesByIds(volunteerUserIds);

  return volunteerUserIds.map((userId) => usersById.get(userId)).filter(Boolean);
};

export const isVolunteer = async ({ complaintId, userId }) => {
  const volunteering = await complaintVolunteersRepository.isVolunteer(
    complaintId,
    userId,
  );

  return {
    complaintId,
    isVolunteer: volunteering,
  };
};
