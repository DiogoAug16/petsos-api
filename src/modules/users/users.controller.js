import * as complaintService from "../complaints/complaints.service.js";
import * as usersService from "./users.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { publicComplaintSummarySchema } from "../../schemas/complaint.schema.js";
import { publicUserProfileSchema } from "../../schemas/user.schema.js";

/** @type {import("express").RequestHandler} */
export const getMe = async (req, res) => {
  const profile = await usersService.getPublicProfileById(req.userId);
  const responseData = publicUserProfileSchema.parse(profile);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getPublicProfile = async (req, res) => {
  const profile = await usersService.getPublicProfileByUsername(
    req.validatedParams.username,
  );
  const responseData = publicUserProfileSchema.parse(profile);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getFollowedComplaints = async (req, res) => {
  const complaints = await complaintService.getFollowedByUsername(
    req.validatedParams.username,
  );
  const responseData = z.array(publicComplaintSummarySchema).parse(complaints);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getFollowedComplaintsSummary = async (req, res) => {
  const responseData = await complaintService.getFollowedSummaryByUsername(
    req.validatedParams.username,
  );
  return success(res, responseData, StatusCodes.OK);
};
