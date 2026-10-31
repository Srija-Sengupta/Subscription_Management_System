import express from "express";
import db from "../database/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get invoices
router.get("/", authenticate, (req, res) => {
  try {
    let invoices;

    if (req.user.role === "admin" || req.user.role === "staff") {
      invoices = db.prepare(`
        SELECT
          invoices.*,
          users.name AS customer_name,
          users.email AS customer_email,
          plans.name AS plan_name,
          products.name AS product_name
        FROM invoices
        JOIN subscriptions
          ON subscriptions.id = invoices.subscription_id
        JOIN users
          ON users.id = subscriptions.customer_id
        JOIN plans
          ON plans.id = subscriptions.plan_id
        JOIN products
          ON products.id = plans.product_id
        ORDER BY invoices.id DESC
      `).all();
    } else {
      invoices = db.prepare(`
        SELECT
          invoices.*,
          users.name AS customer_name,
          users.email AS customer_email,
          plans.name AS plan_name,
          products.name AS product_name
        FROM invoices
        JOIN subscriptions
          ON subscriptions.id = invoices.subscription_id
        JOIN users
          ON users.id = subscriptions.customer_id
        JOIN plans
          ON plans.id = subscriptions.plan_id
        JOIN products
          ON products.id = plans.product_id
        WHERE subscriptions.customer_id = ?
        ORDER BY invoices.id DESC
      `).all(req.user.id);
    }

    res.json(invoices);
  } catch (error) {
    console.error("Fetch invoices error:", error);

    res.status(500).json({
      message: "Unable to fetch invoices"
    });
  }
});

// Create invoice (admin/staff only)
router.post(
  "/",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    try {
      const {
        subscription_id,
        due_date,
        tax_rate = 0
      } = req.body;

      if (!subscription_id) {
        return res.status(400).json({
          message: "Subscription is required"
        });
      }

      const subscription = db.prepare(`
        SELECT
          subscriptions.id,
          subscriptions.status,
          subscriptions.plan_id,
          plans.price
        FROM subscriptions
        JOIN plans
          ON plans.id = subscriptions.plan_id
        WHERE subscriptions.id = ?
      `).get(subscription_id);

      if (!subscription) {
        return res.status(404).json({
          message: "Subscription not found"
        });
      }

      const subtotal = Number(subscription.price);
      const rate = Number(tax_rate);

      if (
        !Number.isFinite(subtotal) ||
        !Number.isFinite(rate) ||
        subtotal < 0 ||
        rate < 0 ||
        rate > 100
      ) {
        return res.status(400).json({
          message: "Invalid invoice amount or tax rate"
        });
      }

      // Find an active discount for this plan.
      // A plan-specific discount takes priority over a general discount.
      const discount = db.prepare(`
        SELECT
          id,
          name,
          discount_type,
          discount_value
        FROM discounts
        WHERE status = 'active'
          AND (plan_id = ? OR plan_id IS NULL)
        ORDER BY
          CASE
            WHEN plan_id = ? THEN 0
            ELSE 1
          END,
          id ASC
        LIMIT 1
      `).get(
        subscription.plan_id,
        subscription.plan_id
      );

      let discountAmount = 0;
      let discountNote = "Discount: None";

      if (discount) {
        const discountValue = Number(discount.discount_value);

        if (discount.discount_type === "percentage") {
          discountAmount = subtotal * discountValue / 100;
        } else if (discount.discount_type === "fixed") {
          discountAmount = discountValue;
        }

        // A discount cannot reduce the subtotal below zero.
        discountAmount = Math.min(discountAmount, subtotal);

        discountNote =
          `Discount: ${discount.name} ` +
          `(${discount.discount_type}: ${discountValue}), ` +
          `amount: ${discountAmount.toFixed(2)}`;
      }

      const discountedSubtotal = subtotal - discountAmount;

      // Tax is calculated after applying the discount.
      const taxAmount = discountedSubtotal * rate / 100;
      const totalAmount = Number(
        (discountedSubtotal + taxAmount).toFixed(2)
      );

      const invoiceNumber = `INV-${Date.now()}-${subscription.id}`;

      const notes = [
        `Subtotal: ${subtotal.toFixed(2)}`,
        discountNote,
        `Tax rate: ${rate}%`,
        `Tax amount: ${taxAmount.toFixed(2)}`
      ].join(" | ");

      const result = db.prepare(`
        INSERT INTO invoices (
          subscription_id,
          invoice_number,
          issue_date,
          due_date,
          amount,
          status,
          notes
        )
        VALUES (?, ?, date('now'), ?, ?, 'Draft', ?)
      `).run(
        subscription.id,
        invoiceNumber,
        due_date || null,
        totalAmount,
        notes
      );

      res.status(201).json({
        message: "Invoice created successfully",
        id: result.lastInsertRowid,
        invoice_number: invoiceNumber,
        subtotal: Number(subtotal.toFixed(2)),
        discount_amount: Number(discountAmount.toFixed(2)),
        tax_rate: rate,
        tax_amount: Number(taxAmount.toFixed(2)),
        amount: totalAmount
      });
    } catch (error) {
      console.error("Create invoice error:", error);

      res.status(500).json({
        message: "Unable to create invoice",
        error: error.message
      });
    }
  }
);

// Update invoice status
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    const { status } = req.body;

    const validStatuses = [
      "Draft",
      "Confirmed",
      "Paid"
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid invoice status"
      });
    }

    const result = db.prepare(`
      UPDATE invoices
      SET status = ?
      WHERE id = ?
    `).run(status, req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({
        message: "Invoice not found"
      });
    }

    res.json({
      message: "Invoice status updated"
    });
  }
);

export default router;