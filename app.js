import express from "express";
import cors from "cors";
import authRoutes from "./src/routes/auth.routes.js";
import masterRoutes from "./src/routes/masters.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/master", masterRoutes);

export default app;
