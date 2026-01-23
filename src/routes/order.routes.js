import express from "express";
import { getOrderByIdController, getOrderByIdOperatorController, getOrderStatsController, listOrdersController, listOrdersReceiveController, listOrdersReceiveReviewController, listOrdersReviewerController, postOrderController, receiveOrderItemController, receiveOrderViewController, receiveReviewItemController, receiveReviewViewController, reviewOrderPricingController, updateOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.get("/stats", getOrderStatsController );
router.post("/save", postOrderController);
router.get("/list", listOrdersController);
router.get("/list-reviewer", listOrdersReviewerController);
router.get("/receive-review", listOrdersReceiveReviewController);
router.post("/receive-item", receiveOrderItemController);
router.post("/receive-review-item", receiveReviewItemController);
router.get("/order/:id", getOrderByIdController);
router.post("/order-review", reviewOrderPricingController);
router.get("/order-receive", listOrdersReceiveController);
router.put("/operator-update/:id", updateOrderController);
router.get("/order-operator/:id", getOrderByIdOperatorController);
router.get("/:orderId/receive-view", receiveOrderViewController);
router.get("/:orderId/receive-review-view", receiveReviewViewController);

export default router;
