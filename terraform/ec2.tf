# 1. Default VPC
resource "aws_default_vpc" "default" {
}

# 2. Dynamic lookup for latest Ubuntu 22.04 LTS AMI if ami_id is not specified
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# 3. Auto-generate RSA key pair if local public_key_path file does not exist
resource "tls_private_key" "generated" {
  count     = fileexists(var.public_key_path) ? 0 : 1
  algorithm = "RSA"
  rsa_bits  = 4096
}

# 4. AWS Key Pair (uses local public key file if available, or generated key)
resource "aws_key_pair" "deployer" {
  key_name   = var.key_name
  public_key = fileexists(var.public_key_path) ? file(var.public_key_path) : tls_private_key.generated[0].public_key_openssh
}

# 5. Security Group attached to Default VPC
resource "aws_security_group" "ec2_sg" {
  name        = "ec2-default-vpc-sg"
  description = "Security group for EC2 instance in default VPC"
  vpc_id      = aws_default_vpc.default.id

  ingress {
    description = "Allow SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "Allow HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Allow all outbound traffic"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "ec2-default-vpc-sg"
  }
}

# 6. EC2 Instance in Default VPC with SSH Key Pair attached
resource "aws_instance" "web" {
  ami                    = var.ami_id != "" ? var.ami_id : data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  vpc_security_group_ids = [aws_security_group.ec2_sg.id]

  tags = {
    Name = "EC2-Instance"
  }
}