/**
 * routes/auth.js - Routes d'authentification
 */

const express  = require("express");
const jwt      = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User     = require("../models/User");

const router = express.Router();

const JWT_SECRET  = process.env.JWT_SECRET  || "change_me_in_production";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "7d";

const signToken = (id) =>
  jwt.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

// ── POST /auth/register - Inscription ────────────────────────────────────────
router.post(
  "/register",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").isLength({ min: 8 }),
    body("name").notEmpty().trim().isLength({ max: 100 }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password, name } = req.body;

      const existing = await User.findOne({ email });
      if (existing)
        return res.status(409).json({ error: "Email déjà utilisé" });

      const user  = await User.create({ email, password, name });
      const token = signToken(user._id);

      res.status(201).json({
        token,
        user: { id: user._id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
  }
);

// ── POST /auth/login - Connexion ──────────────────────────────────────────────
router.post(
  "/login",
  [
    body("email").isEmail().normalizeEmail(),
    body("password").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");

      if (!user || !(await user.comparePassword(password)))
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });

      const token = signToken(user._id);
      res.json({
        token,
        user: { id: user._id, email: user.email, name: user.name, role: user.role },
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la connexion" });
    }
  }
);

module.exports = router;
