import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pkg from "pg";

dotenv.config();
const app = express();
app.use(express.json());

const { Pool } = pkg;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// REGISTER
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  const hashed = bcrypt.hashSync(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hashed]
    );
    res.json({ registered: true });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "Username already exists" });
    }
    res.status(500).json({ error: "Database error" });
  }
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const result = await pool.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );

  if (result.rowCount === 0)
    return res.status(404).json({ error: "User not found" });

  const user = result.rows[0];

  if (!bcrypt.compareSync(password, user.password))
    return res.status(403).json({ error: "Invalid password" });

  const token = jwt.sign(
    { sub: user.id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

// START SERVER
app.listen(3000, () => {
  console.log("Auth service running on 3000");
  console.log("JWT_SECRET:", process.env.JWT_SECRET);
});
