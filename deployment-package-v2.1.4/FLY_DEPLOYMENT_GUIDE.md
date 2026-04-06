# Fly.io Deployment Guide - Resgrid-ESO Bridge v2.1.4

## Quick Deployment Commands

```bash
# 1. Deploy the application
fly deploy

# 2. Set required secrets
fly secrets set RESGRID_USER="EMSadmin"
fly secrets set RESGRID_PASS="a1b2c3D*"
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project",...}'
fly secrets set LOG_SHEET_ID="your-google-sheet-id"

# 3. Verify deployment
fly status
fly logs
```

## Environment Configuration

The application will automatically load these secrets from Fly.io:
- `RESGRID_USER` - Resgrid API username
- `RESGRID_PASS` - Resgrid API password  
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Complete service account JSON
- `LOG_SHEET_ID` - Google Sheets ID for logging

Other configuration is handled via the .env file and fly.toml.

## Health Checks

The application includes health monitoring at `/health` endpoint.
Fly.io will automatically check this endpoint every 15 seconds.

## Scaling Configuration

Current setup:
- 1 GB RAM
- 1 shared CPU
- Minimum 1 machine running
- Auto-start enabled
- Health checks configured

## Troubleshooting

```bash
# Check application status
fly status

# View real-time logs
fly logs

# SSH into the machine
fly ssh console

# Restart the application
fly restart
```

## SFTP Configuration

The application is configured for ESO SFTP uploads:
- Host: sftp.esosuite.net
- User: CA-EMS
- Directory: /CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9

Credentials are included in the .env file for production use.