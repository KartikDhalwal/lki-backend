import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes.js";
import masterRoutes from "./src/routes/masters.routes.js";
import orderRoutes from "./src/routes/order.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/master", masterRoutes);
app.use("/api/order", orderRoutes);

export default app;
