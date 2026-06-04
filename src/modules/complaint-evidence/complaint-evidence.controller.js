import { StatusCodes } from "http-status-codes";
import * as complaintEvidenceService from "./complaint-evidence.service.js";
import { success } from "../../shared/utils/response.util.js";

export const submitEvidence = async (req, res) => {
  const photos = req.files?.map((file) => `/uploads/${file.filename}`) ?? [];

  const result = await complaintEvidenceService.submitEvidence(
    req.params.id,
    req.userId,
    {
      description: req.body.description,
      photos,
    },
  );

  return success(res, result, StatusCodes.CREATED);
};

export const getByComplaintId = async (req, res) => {
  const result = await complaintEvidenceService.getByComplaintId(req.params.id);

  return success(res, result, StatusCodes.OK);
};

export const validateEvidence = async (req, res) => {
  const result = await complaintEvidenceService.validateEvidence(
    req.params.id,
    req.userId,
    { approved: req.body.approved, evidenceIds: req.body.evidenceIds },
  );

  return success(res, result, StatusCodes.OK);
};
