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