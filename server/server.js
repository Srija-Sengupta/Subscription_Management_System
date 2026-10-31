import "dotenv/config";
import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import productRoutes from "./routes/products.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import invoiceRoutes from "./routes/invoices.js";
import paymentRoutes from "./routes/payments.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Subscription Management System API is running",
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});