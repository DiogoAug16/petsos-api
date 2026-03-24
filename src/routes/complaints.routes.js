import { Router } from 'express';
import * as complaintController from '../modules/complaints/complaints.controller.js';
import { Router } from 'express'
import upload from '../shared/middleware/upload.middleware.js'
import complaintsController from '../modules/complaints/complaints.controller.js'


const router = Router();

router.post('/', complaintController.create);
router.get('/', complaintController.getAll);
router.get('/:id', complaintController.getDetail);


router.post(
  '/',
  upload.single('image'), // Middleware para lidar com upload de imagem
  complaintsController.create
)

export default router;