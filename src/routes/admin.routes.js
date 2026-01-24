import express from "express";
import { getAdminDashboardController } from "../controllers/admin.controller.js";

const router = express.Router();

router.get("/dashboard", getAdminDashboardController);

export default router;
