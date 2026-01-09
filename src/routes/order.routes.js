import express from "express";
import { listOrdersController, postOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.post("/save", postOrderController);
router.get("/list", listOrdersController);

export default router;
