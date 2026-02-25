import express from "express";
import { brokerRevieweditemPrint } from "../controllers/public.controller.js";

const router = express.Router();
router.get("/review-print", brokerRevieweditemPrint);

export default router;
