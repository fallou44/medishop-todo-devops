##############################################
# variables.tf - MediShop Todo App
# Toutes les valeurs configurables de l'infra
##############################################

variable "aws_region" {
  description = "Région AWS où déployer l'infrastructure"
  type        = string
  default     = "eu-west-3" # Paris
}

variable "project_name" {
  description = "Nom du projet (utilisé pour tagging et naming)"
  type        = string
  default     = "medishop-todo"
}

variable "environment" {
  description = "Environnement de déploiement (dev, staging, prod)"
  type        = string
  default     = "prod"
}

# ── VPC & Réseau ──────────────────────────────────────────────────────────────

variable "vpc_cidr" {
  description = "CIDR block du VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidr" {
  description = "CIDR du sous-réseau public (Front)"
  type        = string
  default     = "10.0.1.0/24"
}

variable "private_subnet_cidr" {
  description = "CIDR du sous-réseau privé (Back + DB)"
  type        = string
  default     = "10.0.2.0/24"
}

variable "availability_zone" {
  description = "Zone de disponibilité AWS"
  type        = string
  default     = "eu-west-3a"
}

# ── EC2 Instances ─────────────────────────────────────────────────────────────

variable "instance_type" {
  description = "Type d'instance EC2 (tier gratuit)"
  type        = string
  default     = "t3.micro"
}

variable "ami_id" {
  description = "AMI Ubuntu 22.04 LTS (eu-west-3)"
  type        = string
  default     = "ami-0c02fb55956c7d316" # Ubuntu 22.04 LTS - eu-west-3
}

variable "key_pair_name" {
  description = "Nom de la paire de clés SSH AWS"
  type        = string
  # Doit être créée au préalable dans AWS Console
}

variable "admin_ip" {
  description = "IP de l'administrateur pour l'accès SSH (format: x.x.x.x/32)"
  type        = string
  # Ex: "203.0.113.10/32"
}

# ── Tags ──────────────────────────────────────────────────────────────────────

variable "common_tags" {
  description = "Tags communs appliqués à toutes les ressources"
  type        = map(string)
  default = {
    Terraform   = "true"
    ManagedBy   = "terraform"
    Course      = "DevOps-TP"
  }
}
