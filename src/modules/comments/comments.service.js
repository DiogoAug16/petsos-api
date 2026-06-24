import * as commentsRepository from "./comments.repository.js";
import * as usersService from "../users/users.service.js";
import * as commentLikesRepository from "../comment-likes/comment-likes.repository.js";
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

const addLikedByMe = async (comments, userId) => {
  const likedCommentIds = await commentLikesRepository.getLikedCommentIdsByUser(
    comments.map((comment) => comment.id),
    userId,
  );

  return comments.map((comment) => ({
    ...comment,
    likedByMe: likedCommentIds.has(comment.id),
  }));
};

export const getTopLevelByComplaintId = async ({
  complaintId,
  limit,
  cursor,
  userId,
}) => {
  const page = await commentsRepository.getByComplaintId({
    complaintId,
    limit,
    cursor,
  });
  const comments = await usersService.enrichWithUsernames(page.items);
  const commentsWithLikes = await addLikedByMe(comments, userId);

  return {
    ...page,
    items: commentsWithLikes,
  };
};
