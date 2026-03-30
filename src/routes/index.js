import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";
import "../shared/utils/zod.config.js";

const router = Router();

router.use("/complaints", complaintRoutes);

export default router;
