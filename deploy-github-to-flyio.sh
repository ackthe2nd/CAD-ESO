#!/bin/bash
# Deploy Resgrid-ESO Bridge via GitHub to Fly.io

echo "Setting up GitHub deployment to Fly.io..."

# Initialize git repository if not already done
if [ ! -d ".git" ]; then
    git init
    echo "Git repository initialized"
fi

# Copy the updated source files to root for GitHub deployment
cp -r flyio-update/src/* src/ 2>/dev/null || echo "Source files already in place"

# Add all files for commit
git add .
git add .github/
git add src/
git add Dockerfile
git add fly.toml

# Commit changes
git commit -m "Deploy v2.1.6: Call closure detection and timestamp formatting

- Added CallClosed SignalR event handler for real-time closure detection
- Enhanced CallStateChanged and UnitStatusSet event processing  
- Implemented readable timestamp format for Google Sheets (6/9/2025 1:49:43)
- Maintained XML ISO format for ESO compliance
- Added comprehensive call lifecycle tracking"

echo ""
echo "Repository prepared for GitHub deployment"
echo ""
echo "Next steps:"
echo "1. Create GitHub repository: gh repo create resgrid-eso-bridge --public"
echo "2. Push to GitHub: git push -u origin main"
echo "3. Add Fly.io API token to GitHub secrets"
echo "4. Deployment will trigger automatically on push"
echo ""
echo "GitHub Actions will deploy to: resgrid2eso.fly.dev"