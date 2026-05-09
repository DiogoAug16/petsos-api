import { StatusCodes } from "http-status-codes";
import * as commentLikesService from "./comment-likes.service.js";
import { commentLikeResponseSchema } from "../../schemas/comment-like.schema.js";
import { success } from "../../shared/utils/response.util.js";

/** @type {import("express").RequestHandler} */
export const like = async (req, res) => {
  const result = await commentLikesService.like({
    ...req.validatedCommentLikeData,
    userId: req.userId,
  });
  const responseData = commentLikeResponseSchema.parse(result);

  return success(res, responseData, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const unlike = async (req, res) => {
  const result = await commentLikesService.unlike({
    ...req.validatedCommentLikeData,
    userId: req.userId,
  });
  const responseData = commentLikeResponseSchema.parse(result);

  return success(res, responseData, StatusCodes.OK);
};
