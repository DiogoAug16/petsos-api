import * as complaintService from "../complaints/complaints.service.js";
import { success } from "../../shared/utils/response.util.js";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { complaintResponseSchema } from "../../schemas/complaint.schema.js";

/** @type {import("express").RequestHandler} */
export const getFollowedComplaints = async (req, res) => {
  const complaints = await complaintService.getFollowedByUsername(
    req.validatedParams.username,
  );
  const responseData = z.array(complaintResponseSchema).parse(complaints);
  return success(res, responseData, StatusCodes.OK);
};
