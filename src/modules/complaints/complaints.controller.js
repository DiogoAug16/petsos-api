import * as complaintService from "./complaints.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { complaintResponseSchema } from "../../schemas/complaint.schema.js";

/** @type {import("express").RequestHandler} */
export const create = async (req, res) => {
  const complaint = await complaintService.create(req.validatedComplaintData, req.userId);
  const responseData = complaintResponseSchema.parse(complaint);
  return success(res, responseData, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const getAll = async (req, res) => {
  const complaints = await complaintService.getAll();
  const responseData = z.array(complaintResponseSchema).parse(complaints);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getDetail = async (req, res) => {
  const complaint = await complaintService.getDetail(req.params.id);
  const responseData = complaintResponseSchema.parse(complaint);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const patchComplaint = async (req, res) => {
  const complaint = await complaintService.patch(
    req.params.id,
    req.validatedComplaintData,
  );
  const responseData = complaintResponseSchema.parse(complaint);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const deleteComplaint = async (req, res) => {
  const complaint = await complaintService.deleteComplaint(req.params.id, req.userId);
  return success(res, complaint, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getNearest = async (req, res) => {
  const complaints = await complaintService.findNearestWithinRadius(req.validatedQuery);
  const responseData = z.array(complaintResponseSchema).parse(complaints);
  return success(res, responseData, StatusCodes.OK);
};
