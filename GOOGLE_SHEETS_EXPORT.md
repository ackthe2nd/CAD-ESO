# Google Sheets Export Functionality

This document explains how to use the Google Sheets export functionality to export call data from Resgrid to Google Sheets.

## Overview

The Resgrid ESO Bridge includes functionality to export call data directly to Google Sheets without generating XML files or uploading to SFTP. This can be useful for:

- Quickly reviewing recent call activity
- Maintaining a call log for reporting purposes
- Troubleshooting by comparing ESO uploads with source data
- Creating dashboards or reports based on call data

## Prerequisites

Before using this functionality, you must have:

1. Set up Google Sheets integration as described in [GOOGLE_SHEETS_INTEGRATION.md](./GOOGLE_SHEETS_INTEGRATION.md)
2. Verified that your Google service account has access to your Google Sheet

## Local Usage

To export calls to Google Sheets from your local environment:

```bash
# Export active calls only
node export-calls-to-sheets.js --active

# Export calls from the last 7 days (default)
node export-calls-to-sheets.js

# Export calls from the last X days
node export-calls-to-sheets.js --days=30
```

## Fly.io Usage

If you've deployed the application to Fly.io, you can use the included PowerShell script to trigger exports remotely:

```powershell
# Export active calls only
./export-calls-to-sheets.ps1 -Active

# Export calls from the last 7 days (default)
./export-calls-to-sheets.ps1

# Export calls from the last X days
./export-calls-to-sheets.ps1 -Days 30
```

### Requirements for Fly.io Export

1. You must have the Fly CLI installed on your local machine
2. You must be authenticated with Fly.io (`fly auth login`)
3. Your Fly.io deployment must have the Google Sheets credentials properly configured

## Data Fields

The following data is exported to Google Sheets for each call:

1. **Timestamp** - When the export occurred
2. **Call ID** - Unique identifier from Resgrid
3. **Call Type** - Type of call (e.g., Medical, Fire)
4. **Nature** - Nature of the call
5. **Note** - Additional notes about the call
6. **Address** - Street address
7. **City** - City name
8. **State** - State/province
9. **Zip** - ZIP/Postal code
10. **Priority** - Call priority level
11. **Response Mode** - Response mode (e.g., Emergency, Non-Emergency)
12. **Unit Name** - Responding unit identifier
13. **Unit Location** - Location of the responding unit
14. **En Route Time** - When unit reported en route
15. **Arrived Time** - When unit arrived on scene
16. **At Patient Time** - When unit reached the patient
17. **Cleared Time** - When unit cleared the scene
18. **Back In Service Time** - When unit returned to service
19. **Latitude** - Geographic latitude
20. **Longitude** - Geographic longitude
21. **Patient First Name** - Patient's first name (if available)
22. **Patient Last Name** - Patient's last name (if available)
23. **Contact Info** - Contact information
24. **External ID** - External identifier (if any)

## Automated Exports

You can set up automated exports using cron jobs or scheduled tasks:

### Linux/Unix Cron Example

```bash
# Export active calls every 15 minutes
*/15 * * * * cd /path/to/resgrid-eso-bridge && node export-calls-to-sheets.js --active

# Export calls from the last 7 days daily at midnight
0 0 * * * cd /path/to/resgrid-eso-bridge && node export-calls-to-sheets.js
```

### Windows Task Scheduler Example

Create a scheduled task that runs:

```
powershell -ExecutionPolicy Bypass -File C:\path\to\export-calls-to-sheets.ps1 -Active
```

## Troubleshooting

If you encounter issues with the Google Sheets export:

1. Verify your Google service account credentials are properly configured
2. Check that the spreadsheet ID in your environment variables is correct
3. Ensure the Google service account has edit access to the spreadsheet
4. Review the application logs for any error messages

## Common Issues

### "Insufficient Permission" Error
- Make sure your service account has been shared with edit access to the spreadsheet

### "Invalid Credentials" Error
- Verify that your service account JSON is correctly formatted and complete
- For Fly.io deployments, ensure the base64-encoded secret is correctly set

### "Spreadsheet Not Found" Error
- Double-check the spreadsheet ID in your environment variables
- Verify the spreadsheet exists and is accessible to the service account