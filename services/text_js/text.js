import express from "express";
import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Connect to PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// --- CRUD Endpoints ---

// CREATE text
app.post("/texts", async (req, res) => {
  const user_id = req.headers["x-user"]; // <- get user ID from gateway
  const { content } = req.body;

  if (!user_id) return res.status(401).json({ error: "Unauthorized" });
  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const result = await pool.query(
      `INSERT INTO texts (user_id, content, created_at, updated_at)
       VALUES ($1, $2, NOW(), NOW()) RETURNING *`,
      [user_id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// READ all texts
app.get("/texts", async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM texts ORDER BY created_at DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// READ single text
app.get("/texts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM texts WHERE id = $1`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// UPDATE text
app.put("/texts/:id", async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content) return res.status(400).json({ error: "Content is required" });

  try {
    const result = await pool.query(
      `UPDATE texts SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [content, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE text
app.delete("/texts/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`DELETE FROM texts WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Not found" });
    res.json({ deleted: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Text service running on port ${PORT}`));
