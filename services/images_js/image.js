import express from "express";
import dotenv from "dotenv";
import multer from "multer";
import path from "path";
import { Pool } from "pg";
import fs from "fs";
import jwt from "jsonwebtoken";

dotenv.config();

const app = express();
app.use(express.json());

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const uploadFolder = process.env.UPLOAD_PATH || "uploads";
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${ext}`;
    cb(null, name);
  },
});
const upload = multer({ storage });

// --- Middleware: JWT verification ---
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Missing token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub; // store user ID in request
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid token" });
  }
}

// --- Routes ---
app.post("/upload", verifyJWT, upload.single("file"), async (req, res) => {
  try {
    const userId = req.userId;
    const filename = req.file.filename;
    const url = `${process.env.PUBLIC_BASE_URL}/${filename}`;

    await pool.query(
      "INSERT INTO images (user_id, filename, url) VALUES ($1,$2,$3)",
      [userId, filename, url]
    );

    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database or upload error" });
  }
});

app.get("/images/:filename", (req, res) => {
  const filePath = path.join(uploadFolder, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.sendFile(path.resolve(filePath));
  } else {
    res.status(404).json({ error: "File not found" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Image service running on port ${PORT}`));
