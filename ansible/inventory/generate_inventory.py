#!/usr/bin/env python3
"""
generate_inventory.py
Script pour générer l'inventaire Ansible dynamiquement
à partir des outputs Terraform.

Usage:
    cd terraform && terraform output -json > ../ansible/terraform_outputs.json
    cd ../ansible && python3 inventory/generate_inventory.py
"""

import json
import os
import sys


def generate_inventory():
    # Chemin vers les outputs Terraform
    outputs_file = os.path.join(os.path.dirname(__file__), "..", "terraform_outputs.json")

    if not os.path.exists(outputs_file):
        print("ERREUR: terraform_outputs.json introuvable.")
        print("Lancez d'abord: cd terraform && terraform output -json > ../ansible/terraform_outputs.json")
        sys.exit(1)

    with open(outputs_file, "r") as f:
        outputs = json.load(f)

    # Extraction des IPs
    front_ip = outputs.get("front_public_ip", {}).get("value", "")
    back_ip  = outputs.get("back_private_ip", {}).get("value", "")
    db_ip    = outputs.get("db_private_ip", {}).get("value", "")
    key_name = "medishop-key"  # Nom de la clé SSH locale

    inventory_content = f"""##############################################
# inventory/hosts.ini - GÉNÉRÉ AUTOMATIQUEMENT
# Ne pas modifier manuellement !
# Régénérer avec : python3 inventory/generate_inventory.py
##############################################

[front]
front-server ansible_host={front_ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/{key_name}.pem

[back]
back-server ansible_host={back_ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/{key_name}.pem ansible_ssh_common_args='-o ProxyCommand="ssh -i ~/.ssh/{key_name}.pem -o StrictHostKeyChecking=no -W %h:%p ubuntu@{front_ip}"'

[db]
db-server ansible_host={db_ip} ansible_user=ubuntu ansible_ssh_private_key_file=~/.ssh/{key_name}.pem ansible_ssh_common_args='-o ProxyCommand="ssh -i ~/.ssh/{key_name}.pem -o StrictHostKeyChecking=no -W %h:%p ubuntu@{front_ip}"'

[all:vars]
ansible_ssh_common_args='-o StrictHostKeyChecking=no'
ansible_python_interpreter=/usr/bin/python3

[medishop:children]
front
back
db
"""

    output_path = os.path.join(os.path.dirname(__file__), "hosts.ini")
    with open(output_path, "w") as f:
        f.write(inventory_content)

    print(f"✅ Inventaire généré : {output_path}")
    print(f"   Front  : {front_ip}")
    print(f"   Back   : {back_ip}")
    print(f"   DB     : {db_ip}")


if __name__ == "__main__":
    generate_inventory()
