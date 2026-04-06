#!/bin/bash
# Deployment Script for Call Closure Fix v2.1.5

echo "DEPLOYING RESGRID-ESO BRIDGE v2.1.5 - CALL CLOSURE FIX"
echo "======================================================"

# Stop existing machines
echo "Stopping existing machines..."
flyctl machine stop --app resgrid2eso --force 2>/dev/null || true

# Deploy updated application  
echo "Deploying application..."
flyctl deploy --app resgrid2eso

# Check deployment status
echo "Checking deployment status..."
flyctl status --app resgrid2eso

# Show recent logs
echo "Recent logs:"
flyctl logs --app resgrid2eso --lines 20

echo "DEPLOYMENT COMPLETE - Call closure detection fixes are now active"
