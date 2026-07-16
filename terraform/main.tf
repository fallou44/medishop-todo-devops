##############################################
# main.tf - MediShop Todo App
# Infrastructure principale AWS
##############################################

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Optionnel : backend S3 pour le state Terraform
  # backend "s3" {
  #   bucket = "medishop-terraform-state"
  #   key    = "todo-app/terraform.tfstate"
  #   region = "eu-west-3"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.common_tags, {
      Project     = var.project_name
      Environment = var.environment
    })
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# VPC - Virtual Private Cloud
# ══════════════════════════════════════════════════════════════════════════════

resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# ── Internet Gateway ──────────────────────────────────────────────────────────

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# SOUS-RÉSEAUX
# ══════════════════════════════════════════════════════════════════════════════

# Sous-réseau public : Instance Front (Nginx + app)
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = var.public_subnet_cidr
  availability_zone       = var.availability_zone
  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-subnet-public"
    Tier = "public"
  }
}

# Sous-réseau privé : Back + DB
resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = var.private_subnet_cidr
  availability_zone = var.availability_zone

  tags = {
    Name = "${var.project_name}-subnet-private"
    Tier = "private"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# ROUTING TABLES
# ══════════════════════════════════════════════════════════════════════════════

# Route table publique : trafic internet via IGW
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-rt-public"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

# Route table privée : pas d'accès internet direct
resource "aws_route_table" "private" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-rt-private"
  }
}

resource "aws_route_table_association" "private" {
  subnet_id      = aws_subnet.private.id
  route_table_id = aws_route_table.private.id
}

# ══════════════════════════════════════════════════════════════════════════════
# SECURITY GROUPS
# ══════════════════════════════════════════════════════════════════════════════

# ── Security Group : Front ────────────────────────────────────────────────────
resource "aws_security_group" "front" {
  name        = "${var.project_name}-sg-front"
  description = "SG instance Front : Nginx + app front"
  vpc_id      = aws_vpc.main.id

  # SSH depuis l'IP admin uniquement
  ingress {
    description = "SSH admin"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [var.admin_ip]
  }

  # HTTP depuis internet
  ingress {
    description = "HTTP depuis internet"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # HTTPS depuis internet
  ingress {
    description = "HTTPS depuis internet"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Tout trafic sortant autorisé
  egress {
    description = "Tout trafic sortant"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg-front"
  }
}

# ── Security Group : Back ─────────────────────────────────────────────────────
resource "aws_security_group" "back" {
  name        = "${var.project_name}-sg-back"
  description = "SG instance Back : API Node.js"
  vpc_id      = aws_vpc.main.id

  # API depuis le Front uniquement (port 3000)
  ingress {
    description     = "API depuis Front"
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.front.id]
  }

  # SSH depuis le Front (bastion) uniquement
  ingress {
    description     = "SSH depuis Front (bastion)"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.front.id]
  }

  # Tout trafic sortant autorisé
  egress {
    description = "Tout trafic sortant"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg-back"
  }
}

# ── Security Group : DB ───────────────────────────────────────────────────────
resource "aws_security_group" "db" {
  name        = "${var.project_name}-sg-db"
  description = "SG instance DB : MongoDB"
  vpc_id      = aws_vpc.main.id

  # MongoDB depuis le Back uniquement (port 27017)
  ingress {
    description     = "MongoDB depuis Back"
    from_port       = 27017
    to_port         = 27017
    protocol        = "tcp"
    security_groups = [aws_security_group.back.id]
  }

  # SSH depuis le Front (bastion) uniquement
  ingress {
    description     = "SSH depuis Front (bastion)"
    from_port       = 22
    to_port         = 22
    protocol        = "tcp"
    security_groups = [aws_security_group.front.id]
  }

  # Tout trafic sortant autorisé
  egress {
    description = "Tout trafic sortant"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-sg-db"
  }
}

# ══════════════════════════════════════════════════════════════════════════════
# EC2 KEY PAIR
# ══════════════════════════════════════════════════════════════════════════════

# La key pair doit être créée manuellement dans AWS Console
# ou via : aws ec2 create-key-pair --key-name medishop-key --query 'KeyMaterial' > medishop-key.pem

# ══════════════════════════════════════════════════════════════════════════════
# INSTANCES EC2
# ══════════════════════════════════════════════════════════════════════════════

# ── Instance Front ────────────────────────────────────────────────────────────
resource "aws_instance" "front" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.front.id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = true
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y python3 python3-pip
    echo "Front instance ready" > /tmp/ready.txt
  EOF
  )

  tags = {
    Name = "${var.project_name}-front"
    Role = "front"
  }
}

# ── Instance Back ─────────────────────────────────────────────────────────────
resource "aws_instance" "back" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  subnet_id              = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.back.id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 20
    delete_on_termination = true
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y python3 python3-pip
    echo "Back instance ready" > /tmp/ready.txt
  EOF
  )

  tags = {
    Name = "${var.project_name}-back"
    Role = "back"
  }
}

# ── Instance DB ───────────────────────────────────────────────────────────────
resource "aws_instance" "db" {
  ami                    = var.ami_id
  instance_type          = var.instance_type
  key_name               = var.key_pair_name
  subnet_id              = aws_subnet.private.id
  vpc_security_group_ids = [aws_security_group.db.id]

  root_block_device {
    volume_type           = "gp3"
    volume_size           = 30 # Plus d'espace pour les données
    delete_on_termination = true
  }

  user_data = base64encode(<<-EOF
    #!/bin/bash
    apt-get update -y
    apt-get install -y python3 python3-pip
    echo "DB instance ready" > /tmp/ready.txt
  EOF
  )

  tags = {
    Name = "${var.project_name}-db"
    Role = "db"
  }
}
