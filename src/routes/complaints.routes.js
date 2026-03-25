import { Router } from 'express';
import { create, getAll, getDetail } from '../modules/complaints/complaints.controller.js';

const router = Router();

router.post('/', create);
router.get('/', getAll);
router.get('/:id', getDetail);

export default router;