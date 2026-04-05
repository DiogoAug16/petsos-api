import * as complaintService from "./complaints.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";

/** @type {import("express").RequestHandler} */
export const create = async (req, res) => {
  const complaint = await complaintService.create(req.validatedComplaintData);
  return success(res, complaint, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const getAll = async (req, res) => {
  const complaint = await complaintService.getAll();
  return success(res, complaint, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getDetail = async (req, res) => {
  const complaint = await complaintService.getDetail(req.params.id);
  return success(res, complaint, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const patchComplaint = async (req, res) => {
  const complaint = await complaintService.patch(
    req.params.id,
    req.validatedComplaintData,
  );
  return success(res, complaint, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const deleteComplaint = async (req, res) => {
  const complaint = await complaintService.deleteComplaint(req.params.id);
  return success(res, complaint, StatusCodes.OK);
};
