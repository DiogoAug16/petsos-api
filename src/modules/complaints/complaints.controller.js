import * as complaintService from './complaints.service.js';
import { success, error } from '../../shared/utils/responseUtils.js';

export const create = async (req, res) => {
  try {
    const complaint = await complaintService.create(req.body);
    return success(res, complaint, 201);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

export const getAll = async (req, res) => {
  try {
    const complaint = await complaintService.getAll();
    return success(res, complaint, 200);
  } catch (err) {
    return error(res, err.message, 400);
  }
};