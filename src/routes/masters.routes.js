import express from "express";
import { addMasterOptionController, createPriceLogicController, getBrokersController, getBrokersMasterController, getMasterOptions, getNextPriceLogicIdController, getStoneController, getStoneMasterController, getToolsController, getToolsMasterController, listPriceLogicController, postBrokersController, postStoneController, postToolsController, togglePriceLogicStatusController } from "../controllers/masters.controller.js";

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
router.get("/list-price-logic", listPriceLogicController);
router.post("/price-logic", createPriceLogicController);
router.get("/price-logic/next-id", getNextPriceLogicIdController);
router.patch("/price-logic/:id/status", togglePriceLogicStatusController);
router.get("/:type", getMasterOptions);


export default router;
