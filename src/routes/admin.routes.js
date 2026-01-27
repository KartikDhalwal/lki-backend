import express from "express";
import { getAdminDashboardController, getOperatorDashboardController } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/dashboard", getAdminDashboardController);
router.get("/operator/dashboard", getOperatorDashboardController);

export default router;
