##############################################
# Dockerfile - Frontend React
# Build multi-stage : build React → Nginx serve
##############################################

# ── Stage 1 : Build de l'application React ────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances en premier (cache Docker)
COPY package*.json ./
RUN npm ci && npm cache clean --force

# Copier le code source
COPY public/ ./public/
COPY src/    ./src/

# Variables de build injectées via --build-arg
ARG REACT_APP_API_URL=http://localhost:3000
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Build de production optimisé
RUN npm run build

# ── Stage 2 : Nginx pour servir les fichiers statiques ────────────
FROM nginx:1.25-alpine AS runtime

# Supprimer la configuration Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier notre configuration Nginx pour SPA React
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier les fichiers buildés depuis le stage précédent
COPY --from=builder /app/build /usr/share/nginx/html

# Port exposé
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

# Démarrage Nginx en mode foreground (nécessaire pour Docker)
CMD ["nginx", "-g", "daemon off;"]
