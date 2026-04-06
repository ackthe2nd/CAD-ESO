# GitHub to Fly.io Deployment Guide - v2.2.0

## Setup Steps

### 1. Create GitHub Repository
```bash
git init
git add .
git commit -m "Initial commit - Resgrid-ESO Bridge v2.2.0"
git branch -M main
git remote add origin https://github.com/yourusername/resgrid-eso-bridge.git
git push -u origin main
```

### 2. Configure Fly.io Secrets
```bash
# Get your Fly.io API token
fly auth token

# Add to GitHub repository secrets:
# Go to Settings > Secrets and variables > Actions
# Add: FLY_API_TOKEN = your_fly_token
```

### 3. Set Application Secrets on Fly.io
```bash
flyctl secrets set \
  RESGRID_USER="your_resgrid_username" \
  RESGRID_PASS="your_resgrid_password" \
  SFTP_HOST="sftp.esosuite.net" \
  SFTP_USER="CA-EMS" \
  SFTP_PASS="your_eso_password" \
  SFTP_DIR="/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9" \
  GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
  LOG_SHEET_ID="your_google_sheets_id" \
  --app resgrid2eso
```

### 4. Trigger Deployment
Push any changes to main branch or manually trigger via GitHub Actions.

## Files Created

- `.github/workflows/deploy-to-flyio.yml` - GitHub Actions workflow
- `Dockerfile` - Container configuration for production
- `fly.toml` - Fly.io application configuration

## Automatic Deployment

Every push to main branch will:
1. Build the application
2. Run tests
3. Deploy to Fly.io
4. Verify health endpoint

## Production Features Deployed

- Version 2.2.0 with all critical fixes
- Real-time emergency call processing
- ESO-compliant XML generation and upload
- Google Sheets logging with proper timestamps
- Health monitoring and automatic restarts