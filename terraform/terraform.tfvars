##############################################
# terraform.tfvars - MediShop Todo App
# Configuré automatiquement
##############################################

aws_region  = "eu-west-3"
project_name = "medishop-todo"
environment  = "prod"

# Réseau
vpc_cidr            = "10.0.0.0/16"
public_subnet_cidr  = "10.0.1.0/24"
private_subnet_cidr = "10.0.2.0/24"
availability_zone   = "eu-west-3a"

# EC2
instance_type = "t3.micro"
ami_id        = "ami-015cabafc8f6249fe"  # Ubuntu 22.04 LTS eu-west-3

# Clé SSH créée
key_pair_name = "medishop-key"

# Votre adresse IP publique détectée automatiquement
admin_ip = "41.82.211.93/32"
