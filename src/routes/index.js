import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";
import authRoutes from "./auth.routes.js";
import "../config/zod.config.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);

export default router;
