import * as complaintModerationsService from "./complaint-moderations.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";
import {
  complaintModerationPendingItemSchema,
  complaintModerationResponseSchema,
} from "../../schemas/complaint.schema.js";
import { paginatedResponseSchema } from "../../schemas/pagination.schema.js";

/** @type {import("express").RequestHandler} */
export const reportComplaint = async (req, res) => {
  const moderation = await complaintModerationsService.reportComplaint({
    complaintId: req.params.id,
    reporterId: req.userId,
    reason: req.validatedReportData.reason,
  });
  const responseData = complaintModerationResponseSchema.parse(moderation);
  return success(res, responseData, StatusCodes.CREATED);
};

/** @type {import("express").RequestHandler} */
export const getPending = async (req, res) => {
  const moderations = await complaintModerationsService.getPending(req.validatedQuery);
  const responseData = paginatedResponseSchema(
    complaintModerationPendingItemSchema,
  ).parse(moderations);
  return success(res, responseData, StatusCodes.OK);
};

const applyModerationAction = async (req, res, action) => {
  const moderation = await complaintModerationsService.applyAction({
    complaintId: req.params.id,
    adminId: req.userId,
    action,
    reason: req.validatedModerationData.reason,
  });
  const responseData = complaintModerationResponseSchema.parse(moderation);
  return success(res, responseData, StatusCodes.OK);
};

/** @type {import("express").RequestHandler} */
export const approve = async (req, res) => {
  return await applyModerationAction(req, res, "approve");
};

/** @type {import("express").RequestHandler} */
export const reject = async (req, res) => {
  return await applyModerationAction(req, res, "reject");
};

/** @type {import("express").RequestHandler} */
export const hide = async (req, res) => {
  return await applyModerationAction(req, res, "hide");
};
