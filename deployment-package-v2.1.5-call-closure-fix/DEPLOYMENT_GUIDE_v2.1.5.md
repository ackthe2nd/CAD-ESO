# Deployment Package v2.1.5 - Call Closure Fix

## What's Fixed in This Version

### Call Closure Detection System
- **Fixed State Detection**: Corrected logic to detect State === 1 for closed calls
- **Fixed Call Closed Field**: Now displays actual closure timestamps instead of Yes/No
- **Enhanced Closure Time Extraction**: Improved logic to capture closure times from multiple sources
- **Google Sheets Integration**: Proper timestamp formatting for closure data

### Key Changes
1. **sheets-logger.js**: 
   - Fixed extractClosedTime() function to properly detect State === 1
   - Updated callClosed field to show actual timestamps
   - Improved closure time extraction from unit activities and call data

2. **Real-time Detection**:
   - SignalR CallClosed event handler active
   - Immediate Google Sheets updates when calls are closed
   - Proper Pacific Time formatting for all timestamps

## Deployment Instructions

### Option 1: Fly.io CLI Deployment
```bash
# Extract package
tar -xzf deployment-package-v2.1.5-call-closure-fix.tar.gz
cd deployment-package-v2.1.5-call-closure-fix

# Deploy to Fly.io
flyctl deploy --app resgrid2eso

# Verify deployment
flyctl status --app resgrid2eso
flyctl logs --app resgrid2eso
```

### Option 2: Docker Deployment
```bash
# Build and deploy via Docker
docker build -t resgrid-eso-bridge .
docker tag resgrid-eso-bridge registry.fly.io/resgrid2eso:latest
docker push registry.fly.io/resgrid2eso:latest

# Scale up on Fly.io
flyctl scale count 1 --app resgrid2eso
```

## Environment Variables Required
- RESGRID_USER
- RESGRID_PASS  
- GOOGLE_SERVICE_ACCOUNT_JSON
- LOG_SHEET_ID

## Verification Steps
1. Check system logs for "Service started successfully"
2. Verify SignalR connection: "Connected to Resgrid SignalR hub"
3. Close a test call in Resgrid
4. Confirm Google Sheets "Call Closed" field shows timestamp
5. Verify XML upload to ESO SFTP

## Post-Deployment Testing
- Close call 201576 or create a new test call
- System should immediately detect closure via SignalR
- Google Sheets "Call Closed" field should populate with Pacific Time timestamp
- Final XML should upload to ESO with closure data

Generated: 2025-06-13T07:00:58.077Z
Version: 2.1.5 - Call Closure Fix
