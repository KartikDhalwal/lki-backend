import express from "express";
import { getBrokersController, getBrokersMasterController, getStoneController, getStoneMasterController, getToolsController, getToolsMasterController, postBrokersController, postStoneController, postToolsController } from "../controllers/masters.controller.js";

const router = express.Router();

router.get("/stones", getStoneController);
router.get("/master-stones", getStoneMasterController);
router.post("/stones", postStoneController);
router.get("/tools", getToolsController);
router.get("/master-tools", getToolsMasterController);
router.post("/tools", postToolsController);
router.get("/brokers", getBrokersController);
router.get("/master-brokers", getBrokersMasterController);
router.post("/brokers", postBrokersController);

export default router;
