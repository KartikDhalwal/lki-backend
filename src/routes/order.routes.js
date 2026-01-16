import express from "express";
import { getOrderByIdController, listOrdersController, postOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.post("/save", postOrderController);
router.get("/list", listOrdersController);
router.get("/order/:id", getOrderByIdController);

export default router;
