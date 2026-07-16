// init.js - Script d'initialisation MongoDB
// Exécuté automatiquement au premier démarrage du conteneur

// Se connecter à la base de données applicative
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE || "medishop_todos");

// Créer l'utilisateur applicatif avec les droits lecture/écriture
db.createUser({
  user: "todoapp",
  pwd:  "changeme",  // Surcharger avec MONGO_APP_PASSWORD en production
  roles: [
    { role: "readWrite", db: process.env.MONGO_INITDB_DATABASE || "medishop_todos" }
  ]
});

// Créer la collection todos avec un index
db.createCollection("todos");
db.todos.createIndex({ createdBy: 1, completed: 1 });
db.todos.createIndex({ createdBy: 1, priority: 1 });

print("✅ Base de données MediShop initialisée avec succès");
