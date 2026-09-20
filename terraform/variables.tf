variable "aws_region" {
  description = "AWS region for provisioning resources"
  type        = string
  default     = "us-east-2"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t2.micro"
}

variable "ami_id" {
  description = "AMI ID for the EC2 instance (optional, defaults to latest Ubuntu 22.04 LTS)"
  type        = string
  default     = ""
}

variable "key_name" {
  description = "Name of the AWS key pair"
  type        = string
  default     = "ec2-key"
}

variable "public_key_path" {
  description = "Path to local SSH public key file (~/.ssh/id_rsa.pub)"
  type        = string
  default     = "~/.ssh/id_rsa.pub"
} 