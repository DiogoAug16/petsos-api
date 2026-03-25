import { Router } from "express";
import * as complaintController from "../modules/complaints/complaints.controller.js";
import { wrap } from "../shared/utils/controllerHOF.js";
import { validateUploadImage } from "../validators/upload.validator.js";
import { prepareComplaintData } from "../validators/complaint.validator.js";

const router = Router();

router.post("/", validateUploadImage, prepareComplaintData, wrap(complaintController.create));
router.get("/", wrap(complaintController.getAll));
router.get("/:id", wrap(complaintController.getDetail));
router.delete("/:id", wrap(complaintController.deleteComplaint));

export default router;
