#!/bin/bash
# Deploy to Fly.io using Docker

echo "Building and deploying Resgrid-ESO Bridge v2.1.6 to Fly.io..."

# Build the Docker image locally
docker build -t resgrid-eso-bridge:v2.1.6 .

# Tag for Fly.io registry
docker tag resgrid-eso-bridge:v2.1.6 registry.fly.io/resgrid2eso:latest

# Deploy using fly deploy
echo "Deploying to Fly.io production..."
echo "Note: This requires fly CLI to be installed and authenticated"
echo ""
echo "Run these commands to deploy:"
echo "1. fly auth login"
echo "2. fly deploy --app resgrid2eso"
echo ""
echo "Or use the Docker registry approach:"
echo "1. docker login registry.fly.io"
echo "2. docker push registry.fly.io/resgrid2eso:latest"
echo "3. fly deploy --app resgrid2eso --image registry.fly.io/resgrid2eso:latest"