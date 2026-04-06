# Deployment Checklist v2.1.4

## Pre-Deployment Verification
- [x] XML namespace syntax corrected (xmlns:xsi)
- [x] Environment validator functional
- [x] All core modules included
- [x] Deploy script executable
- [x] Configuration templates provided

## Required Environment Variables
Set these before deployment:
```bash
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password
GOOGLE_SERVICE_ACCOUNT_JSON=your_service_account_json
LOG_SHEET_ID=your_google_sheet_id
```

## Deployment Steps

### Local Testing
```bash
cp .env.resgrid-bridge .env
# Edit .env with your credentials
./deploy.sh
```

### Production (Fly.io)
```bash
fly deploy
fly secrets set RESGRID_USER="username"
fly secrets set RESGRID_PASS="password"
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON="$(cat service-account.json)"
fly secrets set LOG_SHEET_ID="sheet_id"
```

## Post-Deployment Verification
- [ ] Health endpoint responds: `curl https://your-app.fly.dev/health`
- [ ] SignalR connection established
- [ ] Google Sheets logging operational
- [ ] SFTP upload functionality working
- [ ] XML files have correct namespace syntax

## Critical Features Verified
- XML compliance with ESO standards
- Real-time call processing
- Comprehensive logging with CallId context
- Environment validation on startup
- Error handling and recovery
- Patient information extraction
- Location field parsing

Ready for production deployment.