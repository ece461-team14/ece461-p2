#!/bin/bash
# install.sh
# Description: Checks for and installs Node.js and NPM if not already installed.
# Date: October 29, 2024
# Dependencies: curl, apt-get, Node.js, NPM
# Contributors: Ata Ulas Guler

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

# Main script execution
echo "Starting the install process..."

install_node
install_npm

echo "Installation complete!"
