import express from "express";
import { addMasterOptionController, createPriceLogicController, exportStoneImportTemplateController, getBrokersController, getBrokersMasterController, getMasterOptions, getNextPriceLogicIdController, getStoneController, getStoneMasterController, getToolsController, getToolsMasterController, importStoneExcelController, listPriceLogicController, postBrokersController, postStoneController, postToolsController, togglePriceLogicStatusController } from "../controllers/masters.controller.js";
import multer from "multer";
import { uploadStoneImage } from "../middlewares/uploadStoneImage.js";

const upload = multer({
    storage: multer.memoryStorage(),
});

const router = express.Router();

router.get("/stones", getStoneController);
router.get("/master-stones", getStoneMasterController);
router.post(
  "/stones",
  uploadStoneImage.single("image"), 
  postStoneController
);router.get("/stones-import-template", exportStoneImportTemplateController);
router.post("/stones-import", upload.single("file"), importStoneExcelController);
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
