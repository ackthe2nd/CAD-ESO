# Final Deployment Command for Your Local Setup

## Quick Deployment

Your existing project at `C:\Users\Ryan\Downloads\resgrid-eso-bridge` contains all the necessary files and credentials. Use this single PowerShell script to deploy with XML namespace fixes:

### Option 1: Use Your Existing Directory
```powershell
# Navigate to your project
cd "C:\Users\Ryan\Downloads\resgrid-eso-bridge"

# Run the complete reset script
.\COMPLETE_FLYIO_RESET_SCRIPT.ps1
```

### Option 2: Manual Commands
If you prefer step-by-step control:

```powershell
cd "C:\Users\Ryan\Downloads\resgrid-eso-bridge"
fly apps destroy resgrid2eso --yes
fly apps create resgrid2eso
fly deploy -a resgrid2eso --ha=false
fly secrets import -a resgrid2eso < .env
```

## What This Fixes

The deployment includes these critical fixes:
- ✅ XML namespace syntax: `xmlns:xsi` instead of `xmlns_xsi`
- ✅ Google Sheets authentication with your working service account
- ✅ Enhanced logging with Call ID context
- ✅ ESO XML compliance for proper upload validation

## Verification

After deployment, check the logs:
```powershell
fly logs -a resgrid2eso
```

You should see:
```
[info]: Successfully authenticated with Resgrid API
[info]: Google Sheets logging initialized successfully
[info]: Connected to Resgrid SignalR hub
[info]: Service started successfully
```

## Your App URL

Once deployed: https://resgrid2eso.fly.dev

The system will immediately start monitoring Resgrid for new emergency calls and generating ESO-compliant XML files with your corrected namespace syntax.