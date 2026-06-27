import * as complaintService from "./complaints.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { complaintResponseSchema } from "../../schemas/complaint.schema.js";
import { paginatedResponseSchema } from "../../schemas/pagination.schema.js";
import { removeUploadedFiles } from "../../validators/upload.validator.js";

/** @type {import("express").RequestHandler} */
export const create = async (req, res) => {
  try {
    const complaint = await complaintService.create(
      req.validatedComplaintData,
      req.userId,
    );
    const responseData = complaintResponseSchema.parse(complaint);
    return success(res, responseData, StatusCodes.CREATED);
  } catch (error) {
    removeUploadedFiles(req.files);
    throw error;
  }
};

/** @type {import("express").RequestHandler} */
export const getAll = async (req, res) => {
  const complaints = await complaintService.getAll(req.validatedQuery);
  const responseData = paginatedResponseSchema(complaintResponseSchema).parse(complaints);
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
  try {
    const complaint = await complaintService.patch(
      req.params.id,
      req.validatedComplaintData,
      req.userId,
    );
    const responseData = complaintResponseSchema.parse(complaint);
    return success(res, responseData, StatusCodes.OK);
  } catch (error) {
    removeUploadedFiles(req.files);
    throw error;
  }
};

/** @type {import("express").RequestHandler} */
export const updateStatus = async (req, res) => {
  const complaint = await complaintService.updateStatus(
    req.params.id,
    req.validatedStatusData.status,
    req.userId,
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

/** @type {import("express").RequestHandler} */
export const getMapComplaints = async (req, res) => {
  const complaints = await complaintService.findWithinBounds(req.validatedQuery);
  const responseData = z.array(complaintResponseSchema).parse(complaints);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getMapTileComplaints = async (req, res) => {
  const complaints = await complaintService.findWithinTile(req.validatedQuery);
  const responseData = z.array(complaintResponseSchema).parse(complaints);
  res.set("Cache-Control", "public, max-age=300, stale-while-revalidate=600");
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const getMapTilesIndex = async (req, res) => {
  const items = await complaintService.getMapTilesIndex(req.validatedQuery);
  res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
  return success(res, { items }, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const confirmResolution = async (req, res) => {
  const complaint = await complaintService.confirmResolution(req.params.id, req.userId);
  const responseData = complaintResponseSchema.parse(complaint);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const requestValidation = async (req, res) => {
  const complaint = await complaintService.requestValidation(
    req.params.id,
    req.userId,
    req.validatedValidationRequestData,
  );
  const responseData = complaintResponseSchema.parse(complaint);
  return success(res, responseData, StatusCodes.OK);
};
