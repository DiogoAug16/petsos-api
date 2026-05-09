import * as commentLikesRepository from "./comment-likes.repository.js";

export const like = async ({ complaintId, commentId, userId }) => {
  return await commentLikesRepository.like({
    complaintId,
    commentId,
    userId,
  });
};

export const unlike = async ({ complaintId, commentId, userId }) => {
  return await commentLikesRepository.unlike({
    complaintId,
    commentId,
    userId,
  });
};
