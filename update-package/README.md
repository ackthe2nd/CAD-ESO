# Resgrid to ESO Bridge - Update Package

This package contains updated files to fix the issue with fetching recent calls and adds new Google Sheets export functionality.

## Installation Instructions

1. Extract all files from this package into your Resgrid to ESO Bridge installation directory
   (This will overwrite some existing files with updated versions)

2. The following files will be added or updated:
   - src/resgrid-api.js - Fixed to handle API endpoint changes
   - export-calls-to-sheets.js - New utility to export calls directly to Google Sheets
   - export-calls-to-sheets.ps1 - PowerShell script for remote export via Fly.io
   - GOOGLE_SHEETS_EXPORT.md - Documentation for the new export feature
   - DEPLOYING_TO_FLY_IO.md - Detailed deployment guide for Fly.io
   - test-direct-sheets-export.js - Test script for the new feature

## After Installation

You can now use the fixed scripts:

```bash
# Fetch and process recent calls (now fixed)
node fetch-existing-calls.js --days=7

# Export calls directly to Google Sheets
node export-calls-to-sheets.js --days=7
node export-calls-to-sheets.js --active
```

If your deployment is on Fly.io, you can also use:

```powershell
# Export from Fly.io deployment
./export-calls-to-sheets.ps1 -Days 7
./export-calls-to-sheets.ps1 -Active
```

See GOOGLE_SHEETS_EXPORT.md for complete documentation.
