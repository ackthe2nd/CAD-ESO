#!/bin/bash
# Automated Fly.io Deployment Script for Resgrid-ESO Bridge v2.1.4

set -e

echo "🚀 Deploying Resgrid-ESO Bridge v2.1.4 to Fly.io..."

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not found. Install from https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if logged in to Fly.io
if ! fly auth whoami &> /dev/null; then
    echo "❌ Not logged in to Fly.io. Run 'fly auth login' first."
    exit 1
fi

# Deploy the application
echo "📦 Deploying application..."
fly deploy --ha=false

# Set secrets (will prompt for values if needed)
echo "🔐 Setting application secrets..."

# Check if secrets are already set
SECRETS_SET=true

if ! fly secrets list | grep -q "RESGRID_USER"; then
    SECRETS_SET=false
fi

if [ "$SECRETS_SET" = false ]; then
    echo "Setting required secrets..."
    
    echo "Setting Resgrid credentials..."
    fly secrets set RESGRID_USER="EMSadmin"
    fly secrets set RESGRID_PASS="a1b2c3D*"
    
    echo "⚠️  You need to set Google Sheets credentials manually:"
    echo "   fly secrets set LOG_SHEET_ID=\"your-google-sheet-id\""
    echo "   fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON='\$(cat service-account.json)'"
    
else
    echo "✅ Secrets already configured"
fi

# Check deployment status
echo "🔍 Checking deployment status..."
fly status

# Show logs
echo "📋 Recent logs:"
fly logs --lines 20

echo "✅ Deployment complete!"
echo "🌐 Your app is available at: https://$(fly info | grep Hostname | awk '{print $2}')"
echo "💚 Health check: https://$(fly info | grep Hostname | awk '{print $2}')/health"

echo ""
echo "📝 Next steps:"
echo "1. Verify the health endpoint is responding"
echo "2. Check logs for any errors: fly logs"
echo "3. Monitor Google Sheets for call processing"
echo "4. Verify SFTP uploads to ESO systems"