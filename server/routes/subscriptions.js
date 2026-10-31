import express from "express";
import db from "../database/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();
router.get("/test", (req, res) => {
  res.json({ message: "Subscription routes are loaded" });
});

// Get subscriptions
router.get("/", authenticate, (req, res) => {
  try {
    let subscriptions;

    if (req.user.role === "admin" || req.user.role === "staff") {
      subscriptions = db.prepare(`
        SELECT
          subscriptions.*,
          users.name AS customer_name,
          users.email AS customer_email,
          plans.name AS plan_name,
          plans.billing_cycle,
          plans.price AS plan_price,
          products.name AS product_name
        FROM subscriptions
        JOIN users ON users.id = subscriptions.customer_id
        JOIN plans ON plans.id = subscriptions.plan_id
        JOIN products ON products.id = plans.product_id
        ORDER BY subscriptions.id DESC
      `).all();
    } else {
      subscriptions = db.prepare(`
        SELECT
          subscriptions.*,
          users.name AS customer_name,
          users.email AS customer_email,
          plans.name AS plan_name,
          plans.billing_cycle,
          plans.price AS plan_price,
          products.name AS product_name
        FROM subscriptions
        JOIN users ON users.id = subscriptions.customer_id
        JOIN plans ON plans.id = subscriptions.plan_id
        JOIN products ON products.id = plans.product_id
        WHERE subscriptions.customer_id = ?
        ORDER BY subscriptions.id DESC
      `).all(req.user.id);
    }

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({
      message: "Unable to fetch subscriptions"
    });
  }
});

// Create subscription
router.post(
  "/",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    try {
      const {
        customer_id,
        plan_id,
        start_date,
        end_date,
        notes
      } = req.body;

      if (!customer_id || !plan_id || !start_date) {
        return res.status(400).json({
          message: "Customer, plan, and start date are required"
        });
      }

      const customer = db.prepare(`
        SELECT id FROM users
        WHERE id = ? AND role = 'customer'
      `).get(customer_id);

      if (!customer) {
        return res.status(404).json({
          message: "Customer not found"
        });
      }

      const plan = db.prepare(`
        SELECT id FROM plans
        WHERE id = ? AND status = 'active'
      `).get(plan_id);

      if (!plan) {
        return res.status(404).json({
          message: "Active plan not found"
        });
      }

      const result = db.prepare(`
        INSERT INTO subscriptions
        (
          customer_id,
          plan_id,
          start_date,
          end_date,
          status,
          notes
        )
        VALUES (?, ?, ?, ?, 'Draft', ?)
      `).run(
        Number(customer_id),
        Number(plan_id),
        start_date,
        end_date || null,
        notes || ""
      );

      res.status(201).json({
        message: "Subscription created",
        id: result.lastInsertRowid
      });
    } catch (error) {
      res.status(500).json({
        message: "Unable to create subscription"
      });
    }
  }
);
router.get(
  "/customers",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    const customers = db
      .prepare(
        "SELECT id, name, email FROM users WHERE role = 'customer' ORDER BY name"
      )
      .all();

    res.json(customers);
  }
);

// Update subscription status
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    const { status } = req.body;

    const validStatuses = [
      "Draft",
      "Quotation",
      "Confirmed",
      "Active",
      "Closed"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid subscription status"
      });
    }

    const result = db.prepare(`
      UPDATE subscriptions
      SET status = ?
      WHERE id = ?
    `).run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Subscription not found"
      });
    }

    res.json({
      message: "Subscription status updated"
    });
  }
);

export default router;