import { StatusCodes } from "http-status-codes";
import * as complaintVotesService from "./complaint-votes.service.js";
import { success } from "../../shared/utils/response.util.js";

export const vote = async (req, res) => {
  const result = await complaintVotesService.vote({
    complaintId: req.params.id,
    userId: req.userId,
    approved: req.body.approved,
  });

  return success(res, result, StatusCodes.CREATED);
};

export const getStatus = async (req, res) => {
  const result = await complaintVotesService.getStatus(req.params.id, req.userId || null);

  return success(res, result, StatusCodes.OK);
};

export const voteEvidenceSelection = async (req, res) => {
  const result = await complaintVotesService.voteEvidenceSelection({
    complaintId: req.params.id,
    userId: req.userId,
    evidenceIds: req.body.evidenceIds,
  });

  return success(res, result, StatusCodes.CREATED);
};

export const getEvidenceSelectionStatus = async (req, res) => {
  const result = await complaintVotesService.getEvidenceSelectionStatus(
    req.params.id,
    req.userId || null,
  );

  return success(res, result, StatusCodes.OK);
};
