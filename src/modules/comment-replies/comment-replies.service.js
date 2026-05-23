import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import * as commentRepliesRepository from "./comment-replies.repository.js";
import * as usersService from "../users/users.service.js";
import * as commentLikesRepository from "../comment-likes/comment-likes.repository.js";
import * as notificationsService from "../notifications/notifications.service.js";

const COMMENTS_COLLECTION = `${env.firebase.collectionPrefix}comments`;

export const create = async ({ complaintId, commentId, userId, text }) => {
  const reply = await commentRepliesRepository.create({
    complaintId,
    commentId,
    userId,
    text,
  });

  const commentDoc = await db.collection(COMMENTS_COLLECTION).doc(commentId).get();
  if (commentDoc.exists) {
    const commentOwnerId = commentDoc.data().userId;

    if (commentOwnerId && commentOwnerId !== userId) {
      await notificationsService.createNotification({
        userId: commentOwnerId,
        complaintId,
        type: "comment_reply",
        message: "Alguém respondeu ao seu comentário.",
        sendPush: false,
      });
    }
  }

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
