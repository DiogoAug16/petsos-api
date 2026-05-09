import { StatusCodes } from "http-status-codes";
import * as commentsService from "./comments.service.js";
import {
  commentResponseSchema,
  commentsPageResponseSchema,
} from "../../schemas/comment.schema.js";
import { success } from "../../shared/utils/response.util.js";

/** @type {import("express").RequestHandler} */
export const create = async (req, res) => {
  const comment = await commentsService.create({
    ...req.validatedCommentData,
    userId: req.userId,
  });
  const responseData = commentResponseSchema.parse(comment);
  return success(res, responseData, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const getByComplaintId = async (req, res) => {
  const comments = await commentsService.getTopLevelByComplaintId(
    req.validatedCommentsQuery,
  );
  const responseData = commentsPageResponseSchema.parse(comments);
  return success(res, responseData, StatusCodes.OK);
};
