import express from "express";
import db from "../database/db.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// Get discount rules (admin/staff only)
router.get(
  "/",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    try {
      const discounts = db.prepare(`
        SELECT
          discounts.*,
          plans.name AS plan_name
        FROM discounts
        LEFT JOIN plans ON plans.id = discounts.plan_id
        ORDER BY discounts.id DESC
      `).all();

      res.json(discounts);
    } catch (error) {
      console.error("Fetch discounts error:", error);
      res.status(500).json({
        message: "Unable to fetch discounts"
      });
    }
  }
);

// Create discount rule (admin/staff only)
router.post(
  "/",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    try {
      const {
        name,
        discount_type,
        discount_value,
        plan_id = null
      } = req.body;

      const value = Number(discount_value);
      const type = String(discount_type || "").toLowerCase();

      if (!name || !["fixed", "percentage"].includes(type)) {
        return res.status(400).json({
          message: "A name and valid discount type are required"
        });
      }

      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        (type === "percentage" && value > 100)
      ) {
        return res.status(400).json({
          message: "Discount value must be positive; percentage cannot exceed 100"
        });
      }

      if (plan_id !== null && plan_id !== "") {
        const plan = db.prepare(
          "SELECT id FROM plans WHERE id = ?"
        ).get(Number(plan_id));

        if (!plan) {
          return res.status(400).json({
            message: "Selected plan does not exist"
          });
        }
      }

      const result = db.prepare(`
        INSERT INTO discounts (
          name,
          discount_type,
          discount_value,
          plan_id
        )
        VALUES (?, ?, ?, ?)
      `).run(
        name.trim(),
        type,
        value,
        plan_id === null || plan_id === "" ? null : Number(plan_id)
      );

      res.status(201).json({
        message: "Discount created successfully",
        id: result.lastInsertRowid
      });
    } catch (error) {
      console.error("Create discount error:", error);
      res.status(500).json({
        message: "Unable to create discount"
      });
    }
  }
);

// Update discount status (admin/staff only)
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "staff"),
  (req, res) => {
    try {
      const { status } = req.body;

      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({
          message: "Status must be active or inactive"
        });
      }

      const result = db.prepare(`
        UPDATE discounts
        SET status = ?
        WHERE id = ?
      `).run(status, req.params.id);

      if (result.changes === 0) {
        return res.status(404).json({
          message: "Discount not found"
        });
      }

      res.json({
        message: "Discount status updated"
      });
    } catch (error) {
      console.error("Update discount status error:", error);
      res.status(500).json({
        message: "Unable to update discount status"
      });
    }
  }
);

export default router;