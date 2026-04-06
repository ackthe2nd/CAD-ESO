# Fixed Fly.io Deployment Commands

## Issue Resolution
The deployment failed due to deprecated Heroku buildpacks. I've created a Dockerfile for reliable deployment.

## Updated Deployment Steps

### 1. Navigate to your project directory
```bash
cd C:\Users\Ryan\Downloads\resgrid-eso-bridge
```

### 2. Copy the updated files
Copy these files to your project directory:
- `Dockerfile` (new)
- `fly.toml` (updated)

### 3. Set required secrets
```bash
flyctl secrets set RESGRID_USER="your_username" --app resgrid2eso
flyctl secrets set RESGRID_PASS="your_password" --app resgrid2eso
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' --app resgrid2eso
flyctl secrets set LOG_SHEET_ID="your_sheet_id" --app resgrid2eso
flyctl secrets set SFTP_HOST="sftp.esosuite.net" --app resgrid2eso
flyctl secrets set SFTP_USER="CA-EMS" --app resgrid2eso
flyctl secrets set SFTP_PASS="your_eso_password" --app resgrid2eso
flyctl secrets set SFTP_DIR="/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9" --app resgrid2eso
```

### 4. Deploy with Docker
```bash
flyctl deploy --app resgrid2eso
```

### 5. Monitor deployment
```bash
flyctl logs --app resgrid2eso
flyctl status --app resgrid2eso
```

### 6. Verify SFTP fix working
```bash
flyctl logs --app resgrid2eso | grep "XML Upload Successful"
```

The Docker deployment will resolve the buildpack sunset issue and deploy your emergency services application with the verified SFTP handshake fix.