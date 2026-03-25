import * as complaintService from './complaints.service.js';
import { success, error } from '../../shared/utils/responseUtils.js';

/** @type {import("express").RequestHandler} */
export const create = async (req, res) => {
  try {
    const complaint = await complaintService.create(req.body);
    return success(res, complaint, 201);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

/** @type {import("express").RequestHandler} */
export const getAll = async (req, res) => {
  try {
    const complaint = await complaintService.getAll();
    return success(res, complaint, 200);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

/** @type {import("express").RequestHandler} */
export const getDetail = async (req, res) => {
  try {
    const complaint = await complaintService.getDetail(req.params.id);
    return success(res, complaint, 200);
  } catch (err) {
    if (err.message === "Denúncia não encontrada"){
      return error(res, err.message, 404);
    }
    return error(res, err.message, 400);
  }
}

/** @type {import("express").RequestHandler} */
export const patchComplaint = async (req,res) => {
  try {
    const complaint = await complaintService.patch(req.params.id, req.body);
    return success(res, complaint, 200);
  } catch (err) {
    if (err.message === "Denúncia não encontrada"){
      return error(res, err.message, 404);
    }
    return error(res, err.message, 400);
  }
}

/** @type {import("express").RequestHandler} */
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await complaintService.deleteComplaint(req.params.id);
    return success(res, complaint, 200);
  } catch (err) {
    if (err.message === "Denúncia não encontrada"){
      return error(res, err.message, 404);
    }
    return error(res, err.message, 400);
  }
};