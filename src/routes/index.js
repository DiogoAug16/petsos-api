import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";
import authRoutes from "./auth.routes.js";
import "../config/zod.config.js";
import complaintFollowersRoutes from "./complaint-followers.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/complaints", complaintRoutes);
router.use("/complaint-followers", complaintFollowersRoutes);

export default router;
