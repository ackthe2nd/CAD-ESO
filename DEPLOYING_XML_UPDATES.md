# Deploying XML Format Updates (v1.4.4)

This guide provides step-by-step instructions for deploying the v1.4.4 update which includes important XML format changes required by ESO.

## Overview of Changes

Version 1.4.4 includes the following XML format updates:
- Removed `<Guid>`, `<ComplaintReportedByDispatch>`, `<VehicleDispatchLocation>`, and `<PatientPhone>` fields
- Fixed `<IncidentAddress1>` to only include the street address portion
- Updated `<UnitNotifiedByDispatch>` to be a proper DateTime field
- Formatted `<PatientDOB>` in YYYY-MM-DD format

## Deployment Steps

### 1. Download the Deployment Package

Download the `resgrid-eso-bridge-deployment-v1.4.4.tar.gz` file to your local machine.

### 2. Deploy to Fly.io

```bash
# Extract the deployment package
tar -xzf resgrid-eso-bridge-deployment-v1.4.4.tar.gz

# Navigate to the extracted directory
cd deployment-package

# Deploy to Fly.io with the --no-cache flag
flyctl deploy --no-cache
```

### 3. Verify the Deployment

After deployment, run the test script to verify the XML format changes:

```bash
# Connect to your Fly.io instance
flyctl ssh console

# Run the test script
node test-xml-changes.js
```

This will output a sample XML with the new format and verify that all required changes have been applied.

### 4. Export to Google Sheets for Verification

You can also export calls to Google Sheets to verify the XML formatting:

```bash
# Export active calls with enhanced sheet logging
node export-calls-to-sheets-enhanced.js --active
```

Check your Google Sheet for new entries and verify that column D contains properly formatted XML.

## Troubleshooting

### Application Crashes or Freezes

If the application stops processing events after a period of time:

1. Check the logs: `flyctl logs`
2. Restart the application: `flyctl restart`
3. Enable more detailed logging by setting: `flyctl secrets set DEBUG=true`

### Port Conflicts

If you see an `EADDRINUSE` error in the logs, ensure you're not running multiple instances that conflict with each other:

```bash
# Check running processes
flyctl status

# View allocated ports
flyctl info
```

## Need Help?

If you encounter any issues with this deployment, please refer to the complete documentation or contact support.