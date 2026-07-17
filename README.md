# 🏥 MediShop Todo App — TP DevOps

> Application de gestion de tâches déployée sur AWS avec une chaîne DevOps complète.

[![CI Backend](https://github.com/VOTRE_USER/medishop-todo-devops/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/VOTRE_USER/medishop-todo-devops/actions)
[![CD Deploy](https://github.com/VOTRE_USER/medishop-todo-devops/actions/workflows/cd.yml/badge.svg)](https://github.com/VOTRE_USER/medishop-todo-devops/actions)

## 🏗️ Architecture

| Couche | Technologie | Réseau |
|--------|-------------|--------|
| **Frontend** | React + Nginx (reverse proxy) | Sous-réseau public |
| **Backend** | Node.js + Express + JWT | Sous-réseau privé |
| **Base de données** | MongoDB 7.0 | Sous-réseau privé |

## 🛠️ Stack technique

- **IaC** : Terraform (AWS VPC, EC2, Security Groups)
- **Config Mgmt** : Ansible (Docker, Nginx, Certbot)
- **Conteneurs** : Docker + Docker Compose
- **CI/CD** : GitHub Actions
- **Cloud** : AWS (eu-west-3 — Paris)
- **SSL** : Let's Encrypt / Certbot

## 🚀 Démarrage rapide

### Local (développement)

```bash
cp .env.example .env
docker compose up --build
```

Accès : http://localhost:3001

### Production (AWS)

Voir le **[📖 GUIDE complet](./GUIDE.md)** pour les instructions détaillées.

## 📁 Structure

```
├── terraform/    # Infrastructure AWS
├── ansible/      # Configuration serveurs
├── app/
│   ├── frontend/ # React
│   ├── backend/  # Node.js API
│   └── db/       # Init MongoDB
├── docker-compose.yml
└── GUIDE.md      # Guide end-to-end
```

## 🔒 Sécurité

- Instances Back/DB **non accessibles depuis Internet**
- SSH uniquement depuis l'IP administrateur
- Secrets via **GitHub Secrets** (aucun secret en clair)
- SSL/TLS via **Let's Encrypt**
- JWT pour l'authentification API
- Images Docker tournant en **utilisateur non-root**

## 📜 Licence

TP éducatif — MediShop — 
