import express from "express";
import Database from "better-sqlite3";

const router = express.Router();
const db = new Database("./database/subscription.db");

// Create payments table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    payment_date TEXT NOT NULL DEFAULT (date('now')),
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
  )
`);

// Get all payments
router.get("/", (req, res) => {
  try {
    const payments = db.prepare(`
      SELECT
        payments.*,
        invoices.invoice_number,
        invoices.amount AS invoice_amount
      FROM payments
      JOIN invoices ON invoices.id = payments.invoice_id
      ORDER BY payments.id DESC
    `).all();

    res.json(payments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Record a payment
router.post("/", (req, res) => {
  try {
    const {
      invoice_id,
      amount,
      payment_method = "Cash",
      payment_date,
      notes
    } = req.body;

    if (!invoice_id || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        error: "A valid invoice ID and payment amount are required"
      });
    }

    const invoice = db.prepare(`
      SELECT id, amount, status
      FROM invoices
      WHERE id = ?
    `).get(invoice_id);

    if (!invoice) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    if (invoice.status === "Paid") {
      return res.status(400).json({ error: "Invoice is already paid" });
    }

    const previousPayments = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE invoice_id = ?
    `).get(invoice_id).total;

    const remaining = Number(invoice.amount) - Number(previousPayments);
    const paymentAmount = Number(amount);

    if (paymentAmount > remaining + 0.001) {
      return res.status(400).json({
        error: `Payment exceeds the remaining balance of ${remaining.toFixed(2)}`
      });
    }

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO payments (
          invoice_id,
          amount,
          payment_method,
          payment_date,
          notes
        )
        VALUES (?, ?, ?, ?, ?)
      `).run(
        invoice_id,
        paymentAmount,
        payment_method,
        payment_date || new Date().toISOString().slice(0, 10),
        notes || null
      );

      const newTotal = Number(previousPayments) + paymentAmount;
      const newStatus =
        newTotal >= Number(invoice.amount) - 0.001 ? "Paid" : "Confirmed";

      db.prepare(`
        UPDATE invoices
        SET status = ?
        WHERE id = ?
      `).run(newStatus, invoice_id);

      return result.lastInsertRowid;
    });

    const paymentId = transaction();

    res.status(201).json({
      message: "Payment recorded successfully",
      paymentId,
      invoiceStatus:
        Number(previousPayments) + paymentAmount >= Number(invoice.amount) - 0.001
          ? "Paid"
          : "Confirmed"
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;