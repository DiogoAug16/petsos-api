import { StatusCodes } from "http-status-codes";
import * as commentRepliesService from "./comment-replies.service.js";
import {
  commentRepliesPageResponseSchema,
  commentReplyResponseSchema,
} from "../../schemas/comment-reply.schema.js";
import { success } from "../../shared/utils/response.util.js";

/** @type {import("express").RequestHandler} */
export const create = async (req, res) => {
  const reply = await commentRepliesService.create({
    ...req.validatedCommentData,
    userId: req.userId,
  });
  const responseData = commentReplyResponseSchema.parse(reply);

  return success(res, responseData, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const getByCommentId = async (req, res) => {
  const replies = await commentRepliesService.getByCommentId({
    ...req.validatedCommentRepliesQuery,
    userId: req.userId,
  });
  const responseData = commentRepliesPageResponseSchema.parse(replies);

  return success(res, responseData, StatusCodes.OK);
};
