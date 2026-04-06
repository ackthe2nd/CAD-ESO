#!/bin/bash
# Deploy DOB Reference Id Fix to Fly.io
echo "Deploying Resgrid-ESO Bridge with DOB Reference Id fix..."
echo "Features:"
echo "  - Authentic DOB extraction from CAD Reference Id"
echo "  - YYYY-MM-DD format standardization"
echo "  - Removed hardcoded fallback values"
echo "  - Enhanced debug logging"
echo ""

# Deploy to Fly.io
fly deploy --app resgrid2eso --strategy docker

echo ""
echo "Deployment completed. DOB extraction now uses authentic CAD data."