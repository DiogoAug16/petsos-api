import { StatusCodes } from "http-status-codes";
import * as complaintValidationsService from "./complaint-validations.service.js";
import { success } from "../../shared/utils/response.util.js";

export const countByComplaintId = async (req, res) => {
  const result = await complaintValidationsService.countByComplaintId(req.params.id);

  return success(res, result, StatusCodes.OK);
};
