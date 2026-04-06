#!/bin/bash

# Resgrid-ESO Bridge v2.2.0 - Production Deployment
# Run this script to deploy to Fly.io

set -e

echo "Deploying Resgrid-ESO Bridge v2.2.0..."

# Check prerequisites
if ! command -v flyctl &> /dev/null; then
    echo "Installing Fly CLI..."
    curl -L https://fly.io/install.sh | sh
    export PATH="$HOME/.fly/bin:$PATH"
fi

# Authenticate if needed
if ! flyctl auth whoami &> /dev/null; then
    echo "Please authenticate with Fly.io:"
    flyctl auth login
fi

# Create app if it doesn't exist
if ! flyctl apps list | grep -q "resgrid2eso"; then
    echo "Creating Fly.io app..."
    flyctl apps create resgrid2eso --region lax
fi

# Deploy
echo "Deploying application..."
flyctl deploy --app resgrid2eso --strategy rolling

# Set secrets automatically
echo "Setting production secrets..."
flyctl secrets set \
  RESGRID_USER="$RESGRID_USER" \
  RESGRID_PASS="$RESGRID_PASS" \
  SFTP_HOST="$SFTP_HOST" \
  SFTP_USER="$SFTP_USER" \
  SFTP_PASS="$SFTP_PASS" \
  SFTP_DIR="$SFTP_DIR" \
  GOOGLE_SERVICE_ACCOUNT_JSON="$GOOGLE_SERVICE_ACCOUNT_JSON" \
  LOG_SHEET_ID="$LOG_SHEET_ID" \
  --app resgrid2eso
echo ""
echo "Then verify deployment: curl https://resgrid2eso.fly.dev/status"