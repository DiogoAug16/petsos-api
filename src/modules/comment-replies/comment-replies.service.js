import * as commentRepliesRepository from "./comment-replies.repository.js";
import * as usersService from "../users/users.service.js";

export const create = async ({ complaintId, commentId, userId, text }) => {
  const reply = await commentRepliesRepository.create({
    complaintId,
    commentId,
    userId,
    text,
  });

  return await usersService.enrichWithUsername(reply);
};

export const getByCommentId = async ({ complaintId, commentId, limit, cursor }) => {
  const page = await commentRepliesRepository.getByCommentId({
    complaintId,
    commentId,
    limit,
    cursor,
  });
  const replies = await usersService.enrichWithUsernames(page.items);

  return {
    ...page,
    items: replies,
  };
};
