import * as commentsRepository from "./comments.repository.js";
import * as usersService from "../users/users.service.js";
import * as notificationsService from "../notifications/notifications.service.js";

export const create = async ({ complaintId, userId, text }) => {
  const comment = await commentsRepository.create({
    complaintId,
    userId,
    text,
  });

  await notificationsService.notifyComplaintFollowers({
    complaintId,
    actorUserId: userId,
    type: "new_comment",
    message: "Novo comentário em uma denúncia que você acompanha.",
    sendPush: false,
  });

  return await usersService.enrichWithUsername(comment);
};

export const getTopLevelByComplaintId = async ({ complaintId, limit, cursor }) => {
  const page = await commentsRepository.getByComplaintId({
    complaintId,
    limit,
    cursor,
  });
  const comments = await usersService.enrichWithUsernames(page.items);

  return {
    ...page,
    items: comments,
  };
};
