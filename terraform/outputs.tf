##############################################
# outputs.tf - MediShop Todo App
# Valeurs exposées après terraform apply
##############################################

output "front_public_ip" {
  description = "IP publique de l'instance Front (Nginx)"
  value       = aws_instance.front.public_ip
}

output "front_public_dns" {
  description = "DNS public de l'instance Front"
  value       = aws_instance.front.public_dns
}

output "back_private_ip" {
  description = "IP privée de l'instance Back (API)"
  value       = aws_instance.back.private_ip
}

output "db_private_ip" {
  description = "IP privée de l'instance DB (MongoDB)"
  value       = aws_instance.db.private_ip
}

output "vpc_id" {
  description = "ID du VPC créé"
  value       = aws_vpc.main.id
}

output "public_subnet_id" {
  description = "ID du sous-réseau public"
  value       = aws_subnet.public.id
}

output "private_subnet_id" {
  description = "ID du sous-réseau privé"
  value       = aws_subnet.private.id
}

output "ssh_command_front" {
  description = "Commande SSH pour se connecter au Front"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem ubuntu@${aws_instance.front.public_ip}"
}

output "ssh_command_back" {
  description = "Commande SSH pour se connecter au Back (via Front bastion)"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem -J ubuntu@${aws_instance.front.public_ip} ubuntu@${aws_instance.back.private_ip}"
}

output "ssh_command_db" {
  description = "Commande SSH pour se connecter à la DB (via Front bastion)"
  value       = "ssh -i ~/.ssh/${var.key_pair_name}.pem -J ubuntu@${aws_instance.front.public_ip} ubuntu@${aws_instance.db.private_ip}"
}

output "ansible_inventory_vars" {
  description = "Variables pour l'inventaire Ansible"
  sensitive   = false
  value = {
    front_ip  = aws_instance.front.public_ip
    back_ip   = aws_instance.back.private_ip
    db_ip     = aws_instance.db.private_ip
  }
}
