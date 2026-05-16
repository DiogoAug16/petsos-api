import * as commentRepliesRepository from "./comment-replies.repository.js";
import * as usersService from "../users/users.service.js";
import * as commentLikesRepository from "../comment-likes/comment-likes.repository.js";

export const create = async ({ complaintId, commentId, userId, text }) => {
  const reply = await commentRepliesRepository.create({
    complaintId,
    commentId,
    userId,
    text,
  });

  return await usersService.enrichWithUsername(reply);
};

const addLikedByMe = async (replies, userId) => {
  const likedCommentIds = await commentLikesRepository.getLikedCommentIdsByUser(
    replies.map((reply) => reply.id),
    userId,
  );

  return replies.map((reply) => ({
    ...reply,
    likedByMe: likedCommentIds.has(reply.id),
  }));
};

export const getByCommentId = async ({
  complaintId,
  commentId,
  limit,
  cursor,
  userId,
}) => {
  const page = await commentRepliesRepository.getByCommentId({
    complaintId,
    commentId,
    limit,
    cursor,
  });
  const replies = await usersService.enrichWithUsernames(page.items);
  const repliesWithLikes = await addLikedByMe(replies, userId);

  return {
    ...page,
    items: repliesWithLikes,
  };
};
