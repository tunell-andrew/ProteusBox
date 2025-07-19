#\!/bin/bash

# Build and run TeraFLOPter Docker container
# This script stops existing containers, rebuilds the image, and starts the container

echo "🛑 Stopping existing container..."
docker container stop local-network-hub 2>/dev/null || echo "No existing container to stop"

echo "🗑️ Removing existing container..."
docker container rm local-network-hub 2>/dev/null || echo "No existing container to remove"

echo "🏗️ Building Docker image..."
docker compose build --no-cache

if [ $? -eq 0 ]; then
    echo "✅ Build successful\!"
    echo "🚀 Starting container..."
    docker compose up -d
    
    if [ $? -eq 0 ]; then
        echo "✅ Container started successfully\!"
        echo "🌐 Application should be available at: http://localhost:7111"
    else
        echo "❌ Failed to start container"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi
