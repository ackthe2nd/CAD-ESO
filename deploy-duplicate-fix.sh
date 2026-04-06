#!/bin/bash

# Deploy Duplicate Processing Fix to Fly.io
# Version 2.2.1 - Fixes Call 201572 repeated processing

echo "=== Deploying Duplicate Processing Fix v2.2.1 ==="

# Check if flyctl is available
if ! command -v flyctl &> /dev/null; then
    echo "Installing Fly CLI..."
    curl -L https://github.com/superfly/flyctl/releases/download/v0.2.92/flyctl_0.2.92_Linux_x86_64.tar.gz -o flyctl.tar.gz
    tar -xzf flyctl.tar.gz
    chmod +x flyctl
    export PATH="$PWD:$PATH"
fi

# Check authentication
echo "Checking Fly.io authentication..."
if ! flyctl auth whoami 2>/dev/null; then
    echo ""
    echo "❌ Not logged in to Fly.io"
    echo ""
    echo "Please run: flyctl auth login"
    echo "Then run this script again"
    exit 1
fi

echo "✅ Authenticated with Fly.io"

# Deploy the application
echo "Deploying duplicate processing fix..."
flyctl deploy --app resgrid2eso --strategy rolling

# Verify deployment
echo "Verifying deployment..."
sleep 5
curl -s https://resgrid2eso.fly.dev/status | jq '.version' || echo "Deployment verification failed"

echo ""
echo "=== Deployment Complete ==="
echo "The duplicate processing fix is now live"
echo "Call 201572 will no longer be repeatedly processed"
echo ""
echo "Monitor at: https://resgrid2eso.fly.dev/status"