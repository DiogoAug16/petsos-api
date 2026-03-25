import { Router } from 'express';
import * as complaintController from '../modules/complaints/complaints.controller.js';

const router = Router();

router.post('/', complaintController.create);
router.get('/', complaintController.getAll);
router.get('/:id', complaintController.getDetail);
router.delete('/:id', complaintController.deleteComplaint);
router.patch('/:id', complaintController.patchComplaint);

export default router;