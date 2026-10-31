
import bcrypt from "bcryptjs";
import db from "./database/db.js";

const email = "admin@brightloop.com";
const password = "Admin@12345";
const hashedPassword = bcrypt.hashSync(password, 10);

const existing = db.prepare(
  "SELECT id FROM users WHERE email = ?"
).get(email);

if (existing) {
  db.prepare(`
    UPDATE users
    SET password = ?, role = 'admin', name = ?
    WHERE email = ?
  `).run(hashedPassword, "Brightloop Admin", email);

  console.log("Admin password reset successfully");
} else {
  db.prepare(`
    INSERT INTO users (name, email, password, role)
    VALUES (?, ?, ?, 'admin')
  `).run("Brightloop Admin", email, hashedPassword);

  console.log("Admin account created successfully");
}

db.close();
