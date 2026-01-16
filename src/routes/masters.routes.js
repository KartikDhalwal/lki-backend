import express from "express";
import { addMasterOptionController, getBrokersController, getBrokersMasterController, getMasterOptions, getStoneController, getStoneMasterController, getToolsController, getToolsMasterController, postBrokersController, postStoneController, postToolsController } from "../controllers/masters.controller.js";

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
router.post("/add-option", addMasterOptionController);
router.get("/:type", getMasterOptions);

export default router;
