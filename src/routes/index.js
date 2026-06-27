import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";
import authRoutes from "./auth.routes.js";
import usersRoutes from "./users.routes.js";
import "../config/zod.config.js";
import complaintFollowersRoutes from "./complaint-followers.routes.js";
import complaintVolunteersRoutes from "./complaint-volunteers.routes.js";
import notificationsRoutes from "./notifications.routes.js";
import routesRoutes from "./routes.routes.js";
import locationsRoutes from "./locations.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", usersRoutes);
router.use("/complaints", complaintRoutes);
router.use("/complaint-followers", complaintFollowersRoutes);
router.use("/complaint-volunteers", complaintVolunteersRoutes);
router.use("/notifications", notificationsRoutes);
router.use("/routes", routesRoutes);
router.use("/locations", locationsRoutes);

export default router;
