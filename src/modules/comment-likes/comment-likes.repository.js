import { db } from "../../config/firebase.js";
import { env } from "../../config/env.js";
import { ConflictError } from "../../shared/errors/conflict.error.js";
import { NotFoundError } from "../../shared/errors/not-found.error.js";
import { ERROR_CODES } from "../../shared/types/error.codes.js";
import { computeScore } from "../comments/comments.score.js";

const COMMENTS_COLLECTION = `${env.firebase.collectionPrefix}comments`;
const COMMENT_LIKES_COLLECTION = `${env.firebase.collectionPrefix}comment_likes`;

const commentsCollection = () => db.collection(COMMENTS_COLLECTION);
const commentLikesCollection = () => db.collection(COMMENT_LIKES_COLLECTION);

const makeDocId = (commentId, userId) => `${commentId}_${userId}`;

const getLikeDocRef = (commentId, userId) => {
  return commentLikesCollection().doc(makeDocId(commentId, userId));
};

const getCommentRef = (commentId) => commentsCollection().doc(commentId);

const validateComment = (commentDoc, complaintId) => {
  if (!commentDoc.exists || commentDoc.data()?.complaintId !== complaintId) {
    throw new NotFoundError(ERROR_CODES.COMMENT_NOT_FOUND);
  }
};

export const like = async ({ complaintId, commentId, userId }) => {
  const commentRef = getCommentRef(commentId);
  const likeRef = getLikeDocRef(commentId, userId);
  let result;

  await db.runTransaction(async (transaction) => {
    const commentDoc = await transaction.get(commentRef);
    validateComment(commentDoc, complaintId);

    const likeDoc = await transaction.get(likeRef);
    if (likeDoc.exists) {
      throw new ConflictError(
        "Usuário já curtiu este comentário",
        ERROR_CODES.COMMENT_ALREADY_LIKED,
      );
    }

    const comment = commentDoc.data();
    const likes = (comment.likes ?? 0) + 1;

    transaction.set(likeRef, {
      complaintId,
      commentId,
      userId,
      createdAt: new Date(),
    });
    transaction.update(commentRef, {
      likes,
      score: computeScore({ likes, createdAt: comment.createdAt }),
    });

    result = {
      commentId,
      liked: true,
      likes,
    };
  });

  return result;
};

export const unlike = async ({ complaintId, commentId, userId }) => {
  const commentRef = getCommentRef(commentId);
  const likeRef = getLikeDocRef(commentId, userId);
  let result;

  await db.runTransaction(async (transaction) => {
    const commentDoc = await transaction.get(commentRef);
    validateComment(commentDoc, complaintId);

    const comment = commentDoc.data();
    const likeDoc = await transaction.get(likeRef);

    if (!likeDoc.exists) {
      result = {
        commentId,
        liked: false,
        likes: comment.likes ?? 0,
      };
      return;
    }

    const likes = Math.max((comment.likes ?? 0) - 1, 0);

    transaction.delete(likeRef);
    transaction.update(commentRef, {
      likes,
      score: computeScore({ likes, createdAt: comment.createdAt }),
    });

    result = {
      commentId,
      liked: false,
      likes,
    };
  });

  return result;
};
