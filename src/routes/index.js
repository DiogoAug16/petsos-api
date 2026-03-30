import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";
import "../config/zod.config.js";

const router = Router();

router.use("/complaints", complaintRoutes);

export default router;
