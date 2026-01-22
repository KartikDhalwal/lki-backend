import express from "express";
import { getOrderByIdController, getOrderByIdOperatorController, getOrderStatsController, listOrdersController, listOrdersReceiveController, listOrdersReviewerController, postOrderController, receiveOrderViewController, reviewOrderPricingController, updateOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.get("/stats", getOrderStatsController );
router.post("/save", postOrderController);
router.get("/list", listOrdersController);
router.get("/list-reviewer", listOrdersReviewerController);
router.get("/order/:id", getOrderByIdController);
router.post("/order-review", reviewOrderPricingController);
router.post("/order-receive", listOrdersReceiveController);
router.put("/operator-update/:id", updateOrderController);
router.get("/order-operator/:id", getOrderByIdOperatorController);
router.get("/:orderId/receive-view", receiveOrderViewController);

export default router;
