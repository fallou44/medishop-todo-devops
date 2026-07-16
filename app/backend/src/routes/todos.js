/**
 * routes/todos.js - Routes CRUD pour les tâches
 */

const express    = require("express");
const { body, param, query, validationResult } = require("express-validator");
const Todo       = require("../models/Todo");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

// ── Validation helper ─────────────────────────────────────────────────────────
const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

// ── GET /todos - Lister toutes les tâches de l'utilisateur ───────────────────
router.get(
  "/",
  [
    query("completed").optional().isBoolean(),
    query("priority").optional().isIn(["low", "medium", "high"]),
    query("page").optional().isInt({ min: 1 }),
    query("limit").optional().isInt({ min: 1, max: 100 }),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const filter = { createdBy: req.user._id };
      if (req.query.completed !== undefined)
        filter.completed = req.query.completed === "true";
      if (req.query.priority)
        filter.priority = req.query.priority;

      const page  = parseInt(req.query.page)  || 1;
      const limit = parseInt(req.query.limit) || 20;
      const skip  = (page - 1) * limit;

      const [todos, total] = await Promise.all([
        Todo.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Todo.countDocuments(filter),
      ]);

      res.json({
        todos,
        pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la récupération des tâches" });
    }
  }
);

// ── POST /todos - Créer une tâche ─────────────────────────────────────────────
router.post(
  "/",
  [
    body("title").notEmpty().trim().isLength({ max: 200 }),
    body("description").optional().trim().isLength({ max: 1000 }),
    body("priority").optional().isIn(["low", "medium", "high"]),
    body("dueDate").optional().isISO8601().toDate(),
    body("category").optional().trim(),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const todo = await Todo.create({
        ...req.body,
        createdBy: req.user._id,
      });
      res.status(201).json(todo);
    } catch (err) {
      res.status(500).json({ error: "Erreur lors de la création de la tâche" });
    }
  }
);

// ── GET /todos/:id - Obtenir une tâche ────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!todo) return res.status(404).json({ error: "Tâche introuvable" });
    res.json(todo);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// ── PUT /todos/:id - Mettre à jour une tâche ──────────────────────────────────
router.put(
  "/:id",
  [
    body("title").optional().trim().isLength({ max: 200 }),
    body("completed").optional().isBoolean(),
    body("priority").optional().isIn(["low", "medium", "high"]),
  ],
  handleValidation,
  async (req, res) => {
    try {
      const todo = await Todo.findOneAndUpdate(
        { _id: req.params.id, createdBy: req.user._id },
        req.body,
        { new: true, runValidators: true }
      );
      if (!todo) return res.status(404).json({ error: "Tâche introuvable" });
      res.json(todo);
    } catch {
      res.status(500).json({ error: "Erreur lors de la mise à jour" });
    }
  }
);

// ── DELETE /todos/:id - Supprimer une tâche ───────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const todo = await Todo.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!todo) return res.status(404).json({ error: "Tâche introuvable" });
    res.json({ message: "Tâche supprimée avec succès" });
  } catch {
    res.status(500).json({ error: "Erreur lors de la suppression" });
  }
});

// ── PATCH /todos/:id/toggle - Basculer le statut completed ───────────────────
router.patch("/:id/toggle", async (req, res) => {
  try {
    const todo = await Todo.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!todo) return res.status(404).json({ error: "Tâche introuvable" });
    todo.completed = !todo.completed;
    await todo.save();
    res.json(todo);
  } catch {
    res.status(500).json({ error: "Erreur serveur" });
  }
});

module.exports = router;
