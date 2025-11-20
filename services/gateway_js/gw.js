import express from "express";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import pkg from "http-proxy";      // <-- import default
const { createProxyServer } = pkg;

dotenv.config();
const app = express();
const proxy = createProxyServer();

const routes = {
  "/auth": "http://localhost:3000",
  "/texts": "http://localhost:3001",
  "/images/upload": "http://localhost:4000"
};

function verifyJWT(req, res, next) {
  if (req.url.startsWith("/auth")) return next();

  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "Missing token" });

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.headers["x-user"] = decoded.sub;
    next();
  } catch {
    return res.status(403).json({ error: "Invalid token" });
  }
}

app.use(express.json());
app.use(verifyJWT);

app.use((req, res) => {
  const targetEntry = Object.entries(routes).find(([prefix]) =>
    req.url.startsWith(prefix)
  );

  if (!targetEntry) return res.status(404).json({ error: "Route not allowed" });

  const [, target] = targetEntry;
  proxy.web(req, res, { target });
});

app.listen(8080, () => console.log("Gateway running on port 8080"));
