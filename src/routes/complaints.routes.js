import { Router } from 'express';
import * as complaintController from '../modules/complaints/complaints.controller.js';

const router = Router();

router.post('/', complaintController.create);
router.get('/', complaintController.getAll);
router.get('/:id', complaintController.getDetail);

export default router;