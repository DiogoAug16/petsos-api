import { Router } from "express";
import complaintRoutes from "./complaints.routes.js";

const router = Router();

router.use("/complaints", complaintRoutes);

export default router;
