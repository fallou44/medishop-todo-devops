##############################################
# Dockerfile - Backend Node.js
# Image multi-stage pour optimiser la taille
##############################################

# ── Stage 1 : Build des dépendances ──────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copier uniquement les fichiers de dépendances (cache layer)
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm install --only=production && npm cache clean --force

# ── Stage 2 : Image finale ────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser  -S nodeuser -u 1001

WORKDIR /app

# Copier les dépendances du stage précédent
COPY --from=deps --chown=nodeuser:nodejs /app/node_modules ./node_modules

# Copier le code source
COPY --chown=nodeuser:nodejs src/ ./src/
COPY --chown=nodeuser:nodejs package.json ./

# Passer à l'utilisateur non-root
USER nodeuser

# Port exposé par l'API
EXPOSE 3000

# Variables d'environnement par défaut (surchargeables)
ENV NODE_ENV=production \
    PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Démarrage
CMD ["node", "src/server.js"]
