import * as complaintService from './complaints.service.js';
import { success, error } from '../../shared/utils/responseUtils.js';
import { upload } from '../../shared/middleware/upload.middleware.js';

export const create = (req, res) => {
  upload.single('image')(req, res, async (err) => {

    //  TRATA ERRO DO MULTER (aqui resolve o 500)
    if (err) {
      return error(res, err.message, 400);
    }

    try {
      const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

      const parsedLocation =
        typeof req.body.location === 'string'
          ? JSON.parse(req.body.location)
          : req.body.location;

      const complaintData = {
        ...req.body,
        location: parsedLocation,
        photos: photoPath ? [photoPath] : [],
      };

      const complaint = await complaintService.create(complaintData);
      return success(res, complaint, 201);

    } catch (err) {
      return error(res, err.message, 400);
    }

  });
};


export const getAll = async (req, res) => {
  try {
    const complaint = await complaintService.getAll();
    return success(res, complaint, 200);
  } catch (err) {
    return error(res, err.message, 400);
  }
};

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