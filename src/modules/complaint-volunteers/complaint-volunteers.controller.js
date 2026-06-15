import { StatusCodes } from "http-status-codes";
import * as complaintVolunteersService from "./complaint-volunteers.service.js";
import { success } from "../../shared/utils/response.util.js";

export const volunteer = async (req, res) => {
  const result = await complaintVolunteersService.volunteer({
    complaintId: req.params.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.CREATED);
};

export const unvolunteer = async (req, res) => {
  const result = await complaintVolunteersService.unvolunteer({
    complaintId: req.params.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.OK);
};

export const count = async (req, res) => {
  const result = await complaintVolunteersService.count(req.params.complaintId);

  return success(res, result, StatusCodes.OK);
};

export const listByComplaint = async (req, res) => {
  const result = await complaintVolunteersService.listByComplaint(req.params.complaintId);

  return success(res, result, StatusCodes.OK);
};

export const isVolunteer = async (req, res) => {
  const result = await complaintVolunteersService.isVolunteer({
    complaintId: req.params.complaintId,
    userId: req.userId,
  });

  return success(res, result, StatusCodes.OK);
};
