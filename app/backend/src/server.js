/**
 * server.js - Point d'entrée de l'API MediShop Todo
 * Express + MongoDB
 */

require("dotenv").config();
const express    = require("express");
const mongoose   = require("mongoose");
const cors       = require("cors");
const helmet     = require("helmet");
const morgan     = require("morgan");
const rateLimit  = require("express-rate-limit");

const todoRoutes = require("./routes/todos");
const authRoutes = require("./routes/auth");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middlewares de sécurité ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  credentials: true,
}));

// Rate limiting : 100 req/min par IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Trop de requêtes, réessayez dans une minute." },
});
app.use(limiter);

// ── Middlewares généraux ─────────────────────────────────────────────────────
app.use(morgan("combined"));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "MediShop Todo API",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

app.use("/auth",  authRoutes);
app.use("/todos", todoRoutes);

// ── Gestion des erreurs ──────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route introuvable" });
});

app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.stack);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

// ── Connexion MongoDB ────────────────────────────────────────────────────────
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/medishop_todos";

mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("✅ Connecté à MongoDB");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 API MediShop Todo démarrée sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ Erreur de connexion MongoDB:", err.message);
    process.exit(1);
  });

// Gestion propre de l'arrêt
process.on("SIGTERM", async () => {
  console.log("SIGTERM reçu, arrêt propre...");
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
