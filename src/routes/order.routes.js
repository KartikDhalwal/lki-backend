import express from "express";
import { getOrderByIdController, getOrderByIdOperatorController, getOrderStatsController, listOrdersController, listOrdersReviewerController, postOrderController, reviewOrderPricingController, updateOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.get("/stats", getOrderStatsController );
router.post("/save", postOrderController);
router.get("/list", listOrdersController);
router.get("/list-reviewer", listOrdersReviewerController);
router.get("/order/:id", getOrderByIdController);
router.post("/order-review", reviewOrderPricingController);
router.put("/operator-update/:id", updateOrderController);
router.get("/order-operator/:id", getOrderByIdOperatorController);

export default router;
