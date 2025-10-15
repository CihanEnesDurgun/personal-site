#!/bin/bash

# Deployment script for cPanel Git Hook
# This script will be executed automatically when you push to the repository

echo "Starting deployment..."

# Navigate to the repository directory
cd /home/yourusername/public_html/personal-site

# Pull the latest changes
git pull origin main

# Install/update Node.js dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "Installing Node.js dependencies..."
    npm install --production
fi

# Set proper permissions
chmod -R 755 .
chmod 644 *.html *.css *.js *.json *.xml *.md

# Restart Node.js application if server.js exists
if [ -f "server.js" ]; then
    echo "Restarting Node.js application..."
    # Find and kill existing Node.js processes for this app
    pkill -f "node.*server.js"
    # Start the application in background
    nohup node server.js > app.log 2>&1 &
fi

echo "Deployment completed successfully!"
echo "Timestamp: $(date)"
