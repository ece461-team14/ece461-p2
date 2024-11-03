#!/bin/bash

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Install Node.js
install_node() {
    if command_exists node; then
        echo "Node.js is already installed."
    else
        echo "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
}

# Install NPM
install_npm() {
    if command_exists npm; then
        echo "NPM is already installed."
    else
        echo "Installing NPM..."
        sudo apt-get install -y npm
    fi
}

# Install AWS SDK for Node.js
install_aws_sdk() {
    if npm list aws-sdk >/dev/null 2>&1; then
        echo "AWS SDK is already installed."
    else
        echo "Installing AWS SDK..."
        npm install aws-sdk
    fi
}

# Install Boto3 (for s3 compatability)
install_boto3() {
    if command_exists pip3; then
        if python3 -c "import boto3" &>/dev/null; then
            echo "boto3 is already installed."
        else
            echo "Installing boto3..."
            pip3 install boto3
        fi
    else
        echo "Installing pip3..."
        sudo apt-get install -y python3-pip
        echo "Installing boto3..."
        pip3 install boto3
    fi
}

# Main script execution
echo "Starting the install process..."

install_node
install_npm
install_boto3
install_aws_sdk

echo "Installation complete!"
