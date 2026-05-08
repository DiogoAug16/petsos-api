import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import "../config/zod.config.js";
import complaintFollowersRoutes from "./complaint-followers.routes.js";
import notificationsRoutes from "./notifications.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/complaints", complaintRoutes);
router.use("/complaint-followers", complaintFollowersRoutes);
router.use("/notifications", notificationsRoutes);

export default router;
