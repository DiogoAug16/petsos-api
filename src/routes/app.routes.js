import { Router } from "express";
import * as appController from "../modules/app/app.controller.js";
import { authenticateToken } from "../shared/middlewares/auth.middleware.js";
import { wrap } from "../shared/utils/async-handler.util.js";

const router = Router();

router.get("/bootstrap", authenticateToken, wrap(appController.bootstrap));

export default router;
