import express from "express";
import { completeOrderController, getOrderByIdController, getOrderByIdOperatorController, getOrderStatsController, listOrdersController, listOrdersReceiveController, listOrdersReceiveReviewController, listOrdersReviewerController, pocSaveController, postOrderController, receiveOrderItemController, receiveOrderViewController, receivePocViewController, receiveReviewOrderController, receiveReviewViewController, reviewOrderPricingController, updateOrderController } from "../controllers/order.controller.js";

const router = express.Router();

router.get("/stats", getOrderStatsController );
router.post("/save", postOrderController);
router.get("/list", listOrdersController);
router.get("/list-reviewer", listOrdersReviewerController);
router.get("/receive-review", listOrdersReceiveReviewController);
router.post("/receive-item", receiveOrderItemController);
router.post("/receive-review-item", receiveReviewOrderController);
router.get("/order/:id", getOrderByIdController);
router.post("/order-review", reviewOrderPricingController);
router.get("/order-receive", listOrdersReceiveController);
router.put("/operator-update/:id", updateOrderController);
router.get("/order-operator/:id", getOrderByIdOperatorController);
router.get("/:orderId/receive-view", receiveOrderViewController);
router.get("/:orderId/receive-review-view", receiveReviewViewController);
router.get("/:id/:orderId/receive-poc-view", receivePocViewController);
router.put("/poc-save", pocSaveController);
router.put("/order-force-complete/:orderId", completeOrderController);

export default router;
