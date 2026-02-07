import express from "express";
import { createUserController, exportStoneMasterExcelController, getAdminDashboardController, getOperatorDashboardController, getUsersController, getUserStatsController, toggleUserStatusController, updateUserController } from "../controllers/admin.controller.js";

const router = express.Router();
router.get("/stones-export", exportStoneMasterExcelController);
router.get("/dashboard", getAdminDashboardController);
router.get("/operator/dashboard", getOperatorDashboardController);
router.get("/users", getUsersController);
router.post("/users", createUserController);
router.get("/users/stats", getUserStatsController);
router.put("/users/:id", updateUserController);
router.patch("/users/:id/status", toggleUserStatusController);
export default router;
