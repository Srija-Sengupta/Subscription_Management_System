
import express from "express";
import db from "../database/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get all products
router.get("/", authenticate, (req, res) => {
  const products = db.prepare(`
    SELECT * FROM products ORDER BY id DESC
  `).all();

  res.json(products);
});

// Create product
router.post(
  "/",
  authenticate,
  authorize("admin"),
  (req, res) => {
    const { name, description, price } = req.body;

    if (!name || price == null || Number(price) < 0) {
      return res.status(400).json({
        message: "Valid product name and price are required"
      });
    }

    const result = db.prepare(`
      INSERT INTO products (name, description, price)
      VALUES (?, ?, ?)
    `).run(name, description || "", Number(price));

    res.status(201).json({
      message: "Product created",
      id: result.lastInsertRowid
    });
  }
);

// Delete product
router.delete(
  "/:id",
  authenticate,
  authorize("admin"),
  (req, res) => {
    try {
      db.prepare(`
        DELETE FROM products WHERE id = ?
      `).run(req.params.id);

      res.json({ message: "Product deleted" });
    } catch {
      res.status(400).json({
        message: "Product is being used by a plan"
      });
    }
  }
);

// Get all plans
router.get("/plans", authenticate, (req, res) => {
  const plans = db.prepare(`
    SELECT plans.*, products.name AS product_name
    FROM plans
    JOIN products ON products.id = plans.product_id
    ORDER BY plans.id DESC
  `).all();

  res.json(plans);
});

// Create plan
router.post(
  "/plans",
  authenticate,
  authorize("admin"),
  (req, res) => {
    const {
      product_id,
      name,
      billing_cycle,
      price
    } = req.body;

    const validCycles = ["daily", "weekly", "monthly", "yearly"];

    if (
      !product_id ||
      !name ||
      !validCycles.includes(billing_cycle) ||
      price == null ||
      Number(price) < 0
    ) {
      return res.status(400).json({
        message: "Please provide valid plan details"
      });
    }

    const product = db.prepare(`
      SELECT id FROM products WHERE id = ?
    `).get(product_id);

    if (!product) {
      return res.status(404).json({
        message: "Product not found"
      });
    }

    const result = db.prepare(`
      INSERT INTO plans
      (product_id, name, billing_cycle, price)
      VALUES (?, ?, ?, ?)
    `).run(
      product_id,
      name,
      billing_cycle,
      Number(price)
    );

    res.status(201).json({
      message: "Plan created",
      id: result.lastInsertRowid
    });
  }
);

export default router;
