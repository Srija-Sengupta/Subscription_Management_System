
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database/db.js";
import { authenticate, authorize } from "../middleware/auth.js";
import dotenv from "dotenv";
dotenv.config();
const router = express.Router();

const passwordValid = (password) =>
  password.length > 8 &&
  /[A-Z]/.test(password) &&
  /[a-z]/.test(password) &&
  /[^A-Za-z0-9]/.test(password);

// Customer registration
router.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      message: "All fields are required"
    });
  }

  if (!passwordValid(password)) {
    return res.status(400).json({
      message: "Password must be longer than 8 characters and contain uppercase, lowercase and special characters"
    });
  }

  try {
    const hashedPassword = bcrypt.hashSync(password, 10);

    const result = db.prepare(`
      INSERT INTO users (name, email, password, role)
      VALUES (?, ?, ?, 'customer')
    `).run(name, email.toLowerCase(), hashedPassword);

    res.status(201).json({
      message: "Registration successful",
      userId: result.lastInsertRowid
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({
        message: "Email already registered"
      });
    }

    res.status(500).json({
      message: "Registration failed"
    });
  }
});

// Login
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = db.prepare(`
    SELECT * FROM users WHERE email = ?
  `).get(email?.toLowerCase());

  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({
      message: "Invalid email or password"
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET,
    { expiresIn: "8h" }
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    }
  });
});

// Admin creates staff
router.post(
  "/staff",
  authenticate,
  authorize("admin"),
  (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password || !passwordValid(password)) {
      return res.status(400).json({
        message: "Provide valid staff details and password"
      });
    }

    try {
      const hashedPassword = bcrypt.hashSync(password, 10);

      db.prepare(`
        INSERT INTO users (name, email, password, role)
        VALUES (?, ?, ?, 'staff')
      `).run(name, email.toLowerCase(), hashedPassword);

      res.status(201).json({
        message: "Staff account created"
      });
    } catch (error) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        return res.status(409).json({
          message: "Email already registered"
        });
      }

      res.status(500).json({
        message: "Could not create staff account"
      });
    }
  }
);

export default router;
