import { StatusCodes } from "http-status-codes";
import * as complaintFollowersService from "./complaint-followers.service.js";
import { success } from "../../shared/utils/response.util.js";

export const follow = async (req, res) => {
  const result = await complaintFollowersService.follow({
    complaintId: req.validatedFollowData.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.CREATED);
};

export const unfollow = async (req, res) => {
  const result = await complaintFollowersService.unfollow({
    complaintId: req.params.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.OK);
};

export const count = async (req, res) => {
  const result = await complaintFollowersService.count(req.params.complaintId);

  return success(res, result, StatusCodes.OK);
};

export const listByComplaint = async (req, res) => {
  const result = await complaintFollowersService.listByComplaint(req.params.complaintId);

  return success(res, result, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const isFollowing = async (req, res) => {
  const result = await complaintFollowersService.isFollowing({
    complaintId: req.params.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const followByParam = async (req, res) => {
  const result = await complaintFollowersService.follow({
    complaintId: req.params.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.CREATED);
};
