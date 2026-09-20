output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.web.id
}

output "public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.web.public_ip
}

output "public_dns" {
  description = "Public DNS of the EC2 instance"
  value       = aws_instance.web.public_dns
}

output "ssh_command" {
  description = "Command to SSH into the instance"
  value       = "ssh -i ${var.public_key_path} ubuntu@${aws_instance.web.public_ip}"
}

output "generated_private_key_pem" {
  description = "Auto-generated private key (only if local public key file was not found)"
  value       = length(tls_private_key.generated) > 0 ? tls_private_key.generated[0].private_key_pem : "Using existing SSH key at ${var.public_key_path}"
  sensitive   = true
}
