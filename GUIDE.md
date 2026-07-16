# 🚀 Guide Complet — MediShop Todo App sur AWS
## TP DevOps : Terraform + Ansible + Docker + GitHub Actions

---

## 📋 Table des matières

1. [Prérequis](#1-prérequis)
2. [Structure du projet](#2-structure-du-projet)
3. [Phase 0 — Préparation locale](#3-phase-0--préparation-locale)
4. [Phase 1 — Infrastructure AWS avec Terraform](#4-phase-1--infrastructure-aws-avec-terraform)
5. [Phase 2 — Configuration des serveurs avec Ansible](#5-phase-2--configuration-des-serveurs-avec-ansible)
6. [Phase 3 — Test local avec Docker Compose](#6-phase-3--test-local-avec-docker-compose)
7. [Phase 4 — CI/CD avec GitHub Actions](#7-phase-4--cicd-avec-github-actions)
8. [Phase 5 — Déploiement et vérification](#8-phase-5--déploiement-et-vérification)
9. [Commandes utiles (dépannage)](#9-commandes-utiles-dépannage)
10. [Architecture réseau expliquée](#10-architecture-réseau-expliquée)

---

## 1. Prérequis

### Outils à installer sur votre machine locale

```bash
# ── Terraform ────────────────────────────────────────────────────
# macOS (Homebrew)
brew tap hashicorp/tap
brew install hashicorp/tap/terraform

# Linux (Ubuntu/Debian)
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Vérifier
terraform --version   # doit être >= 1.5.0

# ── AWS CLI ──────────────────────────────────────────────────────
# macOS
brew install awscli

# Linux
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip && sudo ./aws/install

# Vérifier
aws --version

# ── Ansible ──────────────────────────────────────────────────────
# macOS
brew install ansible

# Linux
pip3 install ansible
pip3 install boto3 botocore   # Pour l'inventaire dynamique AWS

# Collections Ansible nécessaires
ansible-galaxy collection install community.docker
ansible-galaxy collection install amazon.aws

# Vérifier
ansible --version   # doit être >= 2.14

# ── Docker ───────────────────────────────────────────────────────
# Installer Docker Desktop (macOS/Windows) ou Docker Engine (Linux)
# https://docs.docker.com/get-docker/
docker --version
docker compose version

# ── Git ──────────────────────────────────────────────────────────
git --version
```

### Comptes requis

| Service | Utilisation | URL |
|---------|-------------|-----|
| **AWS** | Infrastructure EC2, VPC | https://aws.amazon.com |
| **Docker Hub** | Registre d'images | https://hub.docker.com |
| **GitHub** | Code + CI/CD | https://github.com |
| **Fournisseur DNS** | Domaine (ex: Cloudflare) | — |

---

## 2. Structure du projet

```
medishop-todo-devops/
├── terraform/                   # Infrastructure as Code
│   ├── main.tf                  # Ressources AWS principales
│   ├── variables.tf             # Déclarations des variables
│   ├── outputs.tf               # Sorties Terraform
│   └── terraform.tfvars         # Vos valeurs (à créer, NE PAS committer)
│
├── ansible/                     # Configuration Management
│   ├── ansible.cfg              # Configuration Ansible
│   ├── site.yml                 # Playbook principal
│   ├── inventory/
│   │   ├── generate_inventory.py  # Générateur d'inventaire
│   │   └── hosts.ini            # Inventaire généré (ignoré par git)
│   ├── group_vars/
│   │   ├── all.yml              # Variables communes
│   │   ├── front.yml            # Variables Front
│   │   ├── back.yml             # Variables Back
│   │   └── db.yml               # Variables DB
│   └── roles/
│       ├── common/              # Rôle : Docker + dépendances
│       ├── front/               # Rôle : Nginx + app front
│       ├── back/                # Rôle : API Node.js
│       └── db/                  # Rôle : MongoDB
│
├── app/
│   ├── frontend/                # Application React
│   │   ├── src/                 # Code source React
│   │   ├── Dockerfile           # Image Docker frontend
│   │   └── nginx.conf           # Config Nginx (SPA)
│   ├── backend/                 # API Node.js/Express
│   │   ├── src/                 # Code source Express + MongoDB
│   │   └── Dockerfile           # Image Docker backend
│   ├── db/
│   │   └── init.js              # Script init MongoDB
│   └── .github/workflows/       # Pipelines CI/CD
│       ├── ci-backend.yml       # CI : tests + build backend
│       └── cd.yml               # CD : déploiement AWS
│
├── docker-compose.yml           # Dev local 3 couches
├── .env.example                 # Template variables d'env
├── .gitignore                   # Fichiers ignorés par git
└── GUIDE.md                     # Ce fichier
```

---

## 3. Phase 0 — Préparation locale

### 3.1 Cloner le projet

```bash
# Cloner votre dépôt GitHub
git clone https://github.com/VOTRE_USER/medishop-todo-devops.git
cd medishop-todo-devops
```

### 3.2 Configurer AWS CLI

```bash
# Configurer vos credentials AWS
aws configure

# Renseigner :
# AWS Access Key ID     : [votre clé depuis IAM]
# AWS Secret Access Key : [votre secret depuis IAM]
# Default region name   : eu-west-3
# Default output format : json

# Vérifier que ça fonctionne
aws sts get-caller-identity
# Doit retourner votre Account ID, UserID, ARN
```

### 3.3 Créer la paire de clés SSH AWS

```bash
# Créer la paire de clés dans AWS
aws ec2 create-key-pair \
  --key-name medishop-key \
  --query 'KeyMaterial' \
  --output text > ~/.ssh/medishop-key.pem

# Sécuriser la clé
chmod 400 ~/.ssh/medishop-key.pem

# Vérifier
ls -la ~/.ssh/medishop-key.pem
# -r-------- 1 user group ... medishop-key.pem
```

### 3.4 Récupérer votre IP publique (pour SSH admin)

```bash
# Récupérer votre IP publique actuelle
curl ifconfig.me
# Exemple : 203.0.113.45

# Retenir cette IP au format CIDR : 203.0.113.45/32
```

---

## 4. Phase 1 — Infrastructure AWS avec Terraform

### 4.1 Configurer les variables

```bash
cd terraform/

# Copier le fichier d'exemple
cp terraform.tfvars.example terraform.tfvars

# Éditer avec vos valeurs
nano terraform.tfvars   # ou vim, code, etc.
```

Contenu de `terraform.tfvars` à personnaliser :
```hcl
aws_region    = "eu-west-3"
project_name  = "medishop-todo"
environment   = "prod"

vpc_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"
availability_zone   = "eu-west-3a"

instance_type = "t3.micro"
ami_id        = "ami-0c02fb55956c7d316"   # Ubuntu 22.04 eu-west-3
key_pair_name = "medishop-key"            # Nom de votre paire de clés
admin_ip      = "203.0.113.45/32"         # VOTRE IP (curl ifconfig.me)/32
```

> ⚠️ **IMPORTANT** : Ne jamais committer `terraform.tfvars` sur Git !

### 4.2 Initialiser Terraform

```bash
cd terraform/

# Initialiser : télécharge les providers (hashicorp/aws)
terraform init

# Sortie attendue :
# Terraform has been successfully initialized!
```

### 4.3 Planifier les changements

```bash
# Voir ce que Terraform va créer (simulation, aucun changement réel)
terraform plan

# Sortie attendue : ~20 resources to add, 0 to change, 0 to destroy
# Vérifier les ressources : VPC, Subnets, IGW, Security Groups, EC2 x3
```

### 4.4 Appliquer l'infrastructure

```bash
# Créer l'infrastructure AWS (environ 2-3 minutes)
terraform apply

# Taper "yes" quand demandé
# ou utiliser : terraform apply -auto-approve

# Sortie attendue :
# Apply complete! Resources: 20 added, 0 changed, 0 destroyed.
#
# Outputs:
#   front_public_ip = "52.47.xxx.xxx"
#   back_private_ip = "10.0.2.xxx"
#   db_private_ip   = "10.0.2.xxx"
```

### 4.5 Récupérer et sauvegarder les outputs

```bash
# Afficher tous les outputs
terraform output

# Exporter en JSON pour Ansible
terraform output -json > ../ansible/terraform_outputs.json

# Vérifier le fichier généré
cat ../ansible/terraform_outputs.json | python3 -m json.tool

# Conserver les IPs sous la main
export FRONT_IP=$(terraform output -raw front_public_ip)
export BACK_IP=$(terraform output -raw back_private_ip)
export DB_IP=$(terraform output -raw db_private_ip)

echo "Front : $FRONT_IP"
echo "Back  : $BACK_IP"
echo "DB    : $DB_IP"
```

### 4.6 Tester la connectivité SSH

```bash
# Test SSH vers le Front (directement accessible)
ssh -i ~/.ssh/medishop-key.pem ubuntu@$FRONT_IP "echo 'Front OK'"

# Test SSH vers le Back (via le Front comme bastion)
ssh -i ~/.ssh/medishop-key.pem \
    -J ubuntu@$FRONT_IP \
    ubuntu@$BACK_IP "echo 'Back OK'"

# Test SSH vers la DB (via le Front comme bastion)
ssh -i ~/.ssh/medishop-key.pem \
    -J ubuntu@$FRONT_IP \
    ubuntu@$DB_IP "echo 'DB OK'"
```

### 4.7 Configurer le DNS

```bash
# Dans votre fournisseur DNS (Cloudflare, OVH, Namecheap...)
# Créer un enregistrement A :
#   Type : A
#   Nom  : todo (ou @, ou www)
#   IP   : $FRONT_IP (votre IP publique du Front)
#   TTL  : 300

# Vérifier la propagation DNS (peut prendre quelques minutes)
nslookup todo.votre-domaine.com
dig todo.votre-domaine.com
```

---

## 5. Phase 2 — Configuration des serveurs avec Ansible

### 5.1 Générer l'inventaire Ansible

```bash
cd ansible/

# Générer automatiquement l'inventaire à partir des outputs Terraform
python3 inventory/generate_inventory.py

# Vérifier l'inventaire généré
cat inventory/hosts.ini
```

### 5.2 Tester la connectivité Ansible

```bash
# Test ping vers tous les hôtes
ansible all -m ping -i inventory/hosts.ini

# Sortie attendue :
# front-server | SUCCESS => {"ping": "pong"}
# back-server  | SUCCESS => {"ping": "pong"}
# db-server    | SUCCESS => {"ping": "pong"}
```

### 5.3 Modifier les variables de configuration

```bash
# Éditer les variables du groupe front
nano group_vars/front.yml
```

Mettre à jour :
```yaml
nginx_domain: "todo.votre-domaine.com"   # ← Votre vrai domaine
certbot_email: "admin@votre-domaine.com" # ← Votre email pour Let's Encrypt
```

### 5.4 Lancer le playbook complet

```bash
cd ansible/

# Exécuter le playbook complet (toutes les instances)
ansible-playbook site.yml -i inventory/hosts.ini -v

# Options utiles :
# --check     : Mode simulation (dry-run), aucun changement réel
# --diff      : Afficher les différences de fichiers
# --tags db   : Exécuter seulement les tâches taguées "db"
# --limit front-server : Exécuter seulement sur le Front
```

**Ordre d'exécution du playbook :**
1. **PLAY 1** : Installation Docker sur tous les hôtes (~5 min)
2. **PLAY 2** : Démarrage MongoDB sur DB (~2 min)
3. **PLAY 3** : Démarrage API Backend sur Back (~2 min)
4. **PLAY 4** : Installation Nginx + app Front + SSL Let's Encrypt (~3 min)
5. **PLAY 5** : Vérification finale

### 5.5 Playbook par composant (si besoin)

```bash
# Reconfigurer uniquement la DB
ansible-playbook site.yml --tags db -i inventory/hosts.ini

# Reconfigurer uniquement le Back
ansible-playbook site.yml --tags back -i inventory/hosts.ini

# Reconfigurer uniquement le Front (Nginx + SSL)
ansible-playbook site.yml --tags front,nginx,ssl -i inventory/hosts.ini

# Vérifier l'idempotence (rejouer sans changements)
ansible-playbook site.yml -i inventory/hosts.ini
# Tous les états doivent être "ok" (pas de "changed")
```

### 5.6 Vérifier manuellement les conteneurs

```bash
# Se connecter au Front
ssh -i ~/.ssh/medishop-key.pem ubuntu@$FRONT_IP

# Sur l'instance Front :
docker ps
# Doit afficher : medishop-front (port 3001:80)
nginx -t          # Tester la config Nginx
systemctl status nginx

# Se connecter au Back
ssh -i ~/.ssh/medishop-key.pem -J ubuntu@$FRONT_IP ubuntu@$BACK_IP

# Sur l'instance Back :
docker ps
# Doit afficher : medishop-back (port 3000:3000)
docker logs medishop-back --tail 20
curl http://localhost:3000/health

# Se connecter à la DB
ssh -i ~/.ssh/medishop-key.pem -J ubuntu@$FRONT_IP ubuntu@$DB_IP

# Sur l'instance DB :
docker ps
# Doit afficher : medishop-db (port 27017:27017)
docker exec -it medishop-db mongosh --eval "db.adminCommand('ping')"
```

---

## 6. Phase 3 — Test local avec Docker Compose

```bash
# Revenir à la racine du projet
cd /chemin/vers/medishop-todo-devops

# Copier le fichier .env
cp .env.example .env
nano .env   # Remplir les mots de passe

# Démarrer tous les services localement
docker compose up --build

# En arrière-plan
docker compose up --build -d

# Vérifier les conteneurs
docker compose ps

# Logs en temps réel
docker compose logs -f

# Logs d'un service spécifique
docker compose logs -f back
docker compose logs -f db

# Tester l'API localement
curl http://localhost:3000/health
# {"status":"OK","service":"MediShop Todo API",...}

# Accéder au frontend
open http://localhost:3001   # macOS
xdg-open http://localhost:3001  # Linux

# Arrêter
docker compose down

# Arrêter ET supprimer les volumes
docker compose down -v
```

---

## 7. Phase 4 — CI/CD avec GitHub Actions

### 7.1 Pousser le projet sur GitHub

```bash
cd medishop-todo-devops

# Initialiser git
git init
git add .
git commit -m "feat: initial commit - MediShop Todo DevOps"

# Créer le repo sur GitHub (via l'interface web ou GitHub CLI)
gh repo create medishop-todo-devops --public
# ou manuellement sur github.com

# Pousser
git remote add origin https://github.com/VOTRE_USER/medishop-todo-devops.git
git branch -M main
git push -u origin main
```

### 7.2 Configurer les GitHub Secrets

Dans GitHub : **Settings → Secrets and variables → Actions → New repository secret**

| Nom du secret | Valeur | Description |
|---------------|--------|-------------|
| `DOCKER_USERNAME` | votre_username | Username Docker Hub |
| `DOCKER_TOKEN` | dckr_pat_xxx | Token Docker Hub (Account Settings → Security) |
| `SSH_PRIVATE_KEY` | -----BEGIN RSA PRIVATE KEY----- ... | Contenu complet de `medishop-key.pem` |
| `FRONT_HOST` | 52.47.xxx.xxx | IP publique de l'instance Front |
| `BACK_HOST` | 10.0.2.xxx | IP privée de l'instance Back |
| `MONGO_APP_USERNAME` | todoapp | Utilisateur MongoDB applicatif |
| `MONGO_APP_PASSWORD` | votre_mdp_mongo | Mot de passe MongoDB |
| `MONGO_DB_NAME` | medishop_todos | Nom de la base |
| `JWT_SECRET` | super_secret_min_32_chars | Secret JWT |
| `FRONTEND_URL` | https://todo.votre-domaine.com | URL publique du site |

```bash
# Récupérer le contenu de la clé SSH pour le copier dans GitHub Secrets
cat ~/.ssh/medishop-key.pem
# Copier TOUT le contenu (de -----BEGIN RSA PRIVATE KEY----- à -----END RSA PRIVATE KEY-----)
```

### 7.3 Configurer Docker Hub

```bash
# 1. Se connecter sur hub.docker.com
# 2. Aller dans : Account Settings → Security → New Access Token
# 3. Nom du token : github-actions-medishop
# 4. Permissions : Read & Write
# 5. Copier le token → coller dans le secret DOCKER_TOKEN de GitHub

# Pré-créer les repositories Docker Hub (optionnel, créés automatiquement au push)
# hub.docker.com → Create Repository
# Noms : medishop-todo-back, medishop-todo-front
```

### 7.4 Déclencher le premier pipeline

```bash
# Méthode 1 : Push standard avec tag [all]
git commit --allow-empty -m "ci: déclencher déploiement complet [all]"
git push origin main

# Méthode 2 : Déclenchement manuel sur GitHub
# Aller dans : Actions → CD — Deploy to AWS → Run workflow

# Méthode 3 : Modifier un fichier et pousser
echo "# Deploy test $(date)" >> README.md
git add README.md
git commit -m "feat: test CI/CD [all]"
git push origin main
```

### 7.5 Suivre le pipeline

```bash
# Dans GitHub :
# 1. Onglet "Actions"
# 2. Cliquer sur le workflow en cours
# 3. Observer les jobs en temps réel :
#    - 🔨 Build Backend  → build & push vers Docker Hub
#    - 🎨 Build Frontend → build & push vers Docker Hub
#    - 🚀 Deploy Backend → SSH + docker pull + docker run
#    - 🎨 Deploy Frontend → SSH + docker pull + docker run
#    - 🌐 Verify website → curl vers l'URL du site

# En ligne de commande (GitHub CLI)
gh run list --limit 5
gh run watch   # Suivre le dernier run en temps réel
```

---

## 8. Phase 5 — Déploiement et vérification

### 8.1 Vérification de l'application

```bash
# Test API (health check)
curl https://todo.votre-domaine.com/api/health
# {"status":"OK","db":"connected",...}

# Test inscription d'un utilisateur
curl -X POST https://todo.votre-domaine.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@medishop.fr","password":"Test1234!","name":"Test User"}'

# Test connexion
curl -X POST https://todo.votre-domaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@medishop.fr","password":"Test1234!"}'
# Récupérer le token JWT dans la réponse

# Test création de tâche (remplacer TOKEN par le JWT reçu)
curl -X POST https://todo.votre-domaine.com/api/todos \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ma première tâche","priority":"high","category":"DevOps"}'

# Test récupération des tâches
curl https://todo.votre-domaine.com/api/todos \
  -H "Authorization: Bearer TOKEN"
```

### 8.2 Démonstration de la soutenance (push → mise à jour)

```bash
# Faire une modification visible dans le frontend
# Exemple : modifier le titre dans App.js
sed -i 's/MediShop Todo/MediShop Todo v2/g' app/frontend/src/App.js

# Committer et pousser
git add app/frontend/src/App.js
git commit -m "feat: update app title for demo [front]"
git push origin main

# Observer le pipeline GitHub Actions (~3-5 minutes)
gh run watch

# Après le déploiement, rafraîchir le navigateur :
# https://todo.votre-domaine.com
# → Le titre doit afficher "MediShop Todo v2"
```

### 8.3 Test du rollback

```bash
# Introduire volontairement une erreur pour tester le rollback
# Le pipeline va détecter l'échec du health check et revenir à l'image précédente

# Vérifier sur le serveur
ssh -i ~/.ssh/medishop-key.pem ubuntu@$FRONT_IP
docker ps   # Le conteneur doit tourner avec l'ancienne image
```

---

## 9. Commandes utiles (dépannage)

### Terraform

```bash
# Afficher l'état actuel de l'infra
terraform show

# Rafraîchir l'état (sync avec AWS réel)
terraform refresh

# Détruire toute l'infrastructure (ATTENTION!)
terraform destroy

# Détruire uniquement une ressource spécifique
terraform destroy -target aws_instance.front

# Valider la syntaxe
terraform validate

# Formater les fichiers .tf
terraform fmt -recursive
```

### Ansible

```bash
# Tester sans appliquer (dry-run)
ansible-playbook site.yml --check --diff

# Exécuter avec plus de verbosité
ansible-playbook site.yml -vvv

# Exécuter une commande ad-hoc sur tous les hôtes
ansible all -m command -a "docker ps" -i inventory/hosts.ini

# Vérifier les facts d'un hôte
ansible front -m setup -i inventory/hosts.ini

# Redémarrer Docker sur tous les hôtes
ansible all -m systemd -a "name=docker state=restarted" --become
```

### Docker (sur les instances EC2)

```bash
# Sur l'instance Front
ssh -i ~/.ssh/medishop-key.pem ubuntu@$FRONT_IP

docker ps                          # Conteneurs actifs
docker ps -a                       # Tous les conteneurs
docker logs medishop-front --tail 50  # Logs du conteneur front
docker exec -it medishop-front sh  # Shell dans le conteneur
docker stats                       # Usage CPU/mémoire en temps réel
docker system df                   # Espace utilisé par Docker
docker image prune -f              # Nettoyer les vieilles images

# Redémarrer manuellement un conteneur
docker restart medishop-front

# Pull manuel d'une image
docker pull DOCKER_USERNAME/medishop-todo-front:latest
```

### Nginx (sur l'instance Front)

```bash
# Tester la configuration
sudo nginx -t

# Recharger sans interrompre
sudo systemctl reload nginx

# Redémarrer
sudo systemctl restart nginx

# Voir les logs d'accès en temps réel
sudo tail -f /var/log/nginx/medishop-todo-access.log

# Voir les erreurs Nginx
sudo tail -f /var/log/nginx/medishop-todo-error.log
```

### Certificat SSL (Let's Encrypt)

```bash
# Sur l'instance Front
# Obtenir le certificat manuellement
sudo certbot --nginx -d todo.votre-domaine.com \
  --email admin@votre-domaine.com \
  --agree-tos --non-interactive --redirect

# Vérifier le certificat
sudo certbot certificates

# Tester le renouvellement automatique
sudo certbot renew --dry-run

# Forcer le renouvellement
sudo certbot renew --force-renewal
```

### GitHub Actions

```bash
# Lister les runs récents
gh run list

# Voir les détails d'un run
gh run view RUN_ID

# Rerun un pipeline échoué
gh run rerun RUN_ID

# Voir les secrets configurés
gh secret list
```

---

## 10. Architecture réseau expliquée

```
                    INTERNET
                       │
              ┌────────▼────────┐
              │  AWS Internet    │
              │    Gateway       │
              └────────┬────────┘
                       │
         ┌─────────────▼──────────────────┐
         │         VPC (10.0.0.0/16)       │
         │                                 │
         │  ┌──────────────────────────┐   │
         │  │  Sous-réseau PUBLIC      │   │
         │  │  (10.0.1.0/24)           │   │
         │  │                          │   │
         │  │  ┌────────────────────┐  │   │
         │  │  │  EC2 FRONT         │  │   │
         │  │  │  IP Publique       │◄─┼───┼── HTTP/HTTPS (Internet)
         │  │  │                    │◄─┼───┼── SSH (Admin IP seulement)
         │  │  │  ┌──────────────┐  │  │   │
         │  │  │  │ Docker:front │  │  │   │
         │  │  │  │ (React:3001) │  │  │   │
         │  │  │  └──────────────┘  │  │   │
         │  │  │  Nginx (80/443)    │  │   │
         │  │  └──────────┬─────────┘  │   │
         │  └─────────────┼────────────┘   │
         │                │                │
         │  ┌─────────────▼──────────────┐ │
         │  │  Sous-réseau PRIVÉ          │ │
         │  │  (10.0.2.0/24)              │ │
         │  │                             │ │
         │  │  ┌──────────────────────┐   │ │
         │  │  │  EC2 BACK            │   │ │
         │  │  │  IP Privée           │◄──┼─┼── Port 3000 (depuis Front)
         │  │  │  ┌────────────────┐  │   │ │
         │  │  │  │ Docker:back    │  │   │ │
         │  │  │  │ (Node.js:3000) │  │   │ │
         │  │  │  └────────────────┘  │   │ │
         │  │  └──────────┬───────────┘   │ │
         │  │             │               │ │
         │  │  ┌──────────▼───────────┐   │ │
         │  │  │  EC2 DB              │   │ │
         │  │  │  IP Privée           │◄──┼─┼── Port 27017 (depuis Back)
         │  │  │  ┌────────────────┐  │   │ │
         │  │  │  │ Docker:db      │  │   │ │
         │  │  │  │ (MongoDB:27017)│  │   │ │
         │  │  │  └────────────────┘  │   │ │
         │  │  └──────────────────────┘   │ │
         │  └─────────────────────────────┘ │
         └─────────────────────────────────┘

Règles Security Groups :
  Front SG : ENTRÉE  → 80/443 depuis 0.0.0.0/0 | 22 depuis Admin-IP/32
             SORTIE  → Tout
  Back SG  : ENTRÉE  → 3000 depuis Front-SG | 22 depuis Front-SG
             SORTIE  → Tout
  DB SG    : ENTRÉE  → 27017 depuis Back-SG | 22 depuis Front-SG
             SORTIE  → Tout
```

### Flux de requête utilisateur

```
Utilisateur
  → DNS (todo.votre-domaine.com → IP publique Front)
  → AWS Internet Gateway
  → Instance FRONT (IP publique, SG autorise 80/443)
  → Nginx (écoute sur 80, redirige vers 443)
  → Nginx (écoute sur 443, déchiffre SSL)
  → Si /api/* → proxy vers Back:3000 (réseau privé)
  → Si /      → proxy vers Front conteneur:3001
  → Instance BACK (IP privée, SG autorise 3000 depuis Front)
  → Docker API Node.js
  → Instance DB (IP privée, SG autorise 27017 depuis Back)
  → Docker MongoDB
```

---

## 📊 Vérification finale pour la soutenance

```bash
# Checklist avant la démo

# ✅ Infrastructure Terraform
terraform show | grep -E "(front|back|db).*instance"

# ✅ Connectivité SSH
ssh -i ~/.ssh/medishop-key.pem ubuntu@$FRONT_IP "echo OK"

# ✅ Conteneurs actifs
ssh -i ~/.ssh/medishop-key.pem ubuntu@$FRONT_IP "docker ps --format 'table {{.Names}}\t{{.Status}}'"

# ✅ HTTPS fonctionnel
curl -I https://todo.votre-domaine.com

# ✅ API health check
curl https://todo.votre-domaine.com/api/health

# ✅ Certificat SSL valide
echo | openssl s_client -connect todo.votre-domaine.com:443 2>/dev/null | openssl x509 -noout -dates

# ✅ Démo live (push → update)
echo "test $(date)" >> app/frontend/src/App.js
git add . && git commit -m "feat: soutenance demo [front]" && git push
# → Montrer le pipeline GitHub Actions
# → Rafraîchir le site après ~3 min → changement visible
```

---

*Projet MediShop Todo — TP DevOps — Infrastructure as Code avec Terraform, Ansible, Docker & GitHub Actions*
