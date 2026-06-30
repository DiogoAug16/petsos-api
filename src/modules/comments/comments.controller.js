import { StatusCodes } from "http-status-codes";
import * as commentsService from "./comments.service.js";
import * as complaintModerationsService from "../complaint-moderations/complaint-moderations.service.js";
import {
  commentResponseSchema,
  commentsPageResponseSchema,
} from "../../schemas/comment.schema.js";
import { complaintModerationResponseSchema } from "../../schemas/complaint.schema.js";
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
  const comments = await commentsService.getTopLevelByComplaintId({
    ...req.validatedCommentsQuery,
    userId: req.userId,
  });
  const responseData = commentsPageResponseSchema.parse(comments);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const report = async (req, res) => {
  const moderation = await complaintModerationsService.reportComment({
    ...req.validatedCommentReportData,
    reporterId: req.userId,
  });
  const responseData = complaintModerationResponseSchema.parse(moderation);
  return success(res, responseData, StatusCodes.CREATED);
};
