/**
 * models/Todo.js - Modèle Mongoose pour les tâches
 */

const mongoose = require("mongoose");

const todoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Le titre est obligatoire"],
      trim: true,
      maxlength: [200, "Le titre ne peut pas dépasser 200 caractères"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "La description ne peut pas dépasser 1000 caractères"],
      default: "",
    },
    completed: {
      type: Boolean,
      default: false,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    dueDate: {
      type: Date,
      default: null,
    },
    category: {
      type: String,
      trim: true,
      default: "Général",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true, // Ajoute createdAt et updatedAt automatiquement
  }
);

// Index pour optimiser les requêtes par utilisateur
todoSchema.index({ createdBy: 1, completed: 1 });
todoSchema.index({ createdBy: 1, priority: 1 });

module.exports = mongoose.model("Todo", todoSchema);
