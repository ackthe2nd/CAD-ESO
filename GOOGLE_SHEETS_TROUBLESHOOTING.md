# Google Sheets Integration Troubleshooting Guide

The Resgrid to ESO Bridge includes integration with Google Sheets for logging call data. This guide will help you troubleshoot and resolve common issues with the Google Sheets integration.

## Common Issues and Solutions

### 1. Logging Stops Working After Initial Success

**Symptoms:**
- Logs appear in Google Sheets initially but then stop being added
- No error messages in logs

**Causes:**
- Authentication token expiration
- Google API rate limiting
- Network connectivity issues

**Solutions:**
- The updated sheets-logger.js (v1.4.5+) includes automatic token refresh every 30 minutes
- If issues persist, try restarting the service: `fly restart`
- Check logs for specific error messages: `fly logs | grep "Google Sheets"`

### 2. Invalid Credentials Errors

**Symptoms:**
- Errors containing "invalid_grant", "invalid credentials", or "auth"
- Failed to initialize Google Sheets

**Causes:**
- Expired or incorrect service account credentials
- Base64 encoding issues with credentials
- Incorrect permissions on the Google Sheet

**Solutions:**
- Verify your service account has edit access to the spreadsheet
- Re-generate and update the service account credentials
- Make sure the base64 encoding is correct (no line breaks or extra characters)

### 3. No Sheets Created

**Symptoms:**
- No "Logs" or "Call Data" sheets created in your Google Sheet

**Causes:**
- Insufficient permissions
- Incorrect spreadsheet ID
- Initialization failing

**Solutions:**
- Verify the `LOG_SHEET_ID` environment variable is correct
- Check that your service account has edit access to the spreadsheet
- Try manually creating a sheet named "Call Data" with the appropriate headers
- Restart the service to trigger re-initialization

## Environment Variables

The Google Sheets integration uses the following environment variables:

1. `LOG_SHEET_ID` - The ID of your Google Sheet (required)
2. `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` - Base64 encoded service account credentials (recommended)

## Logs to Monitor

When troubleshooting Google Sheets integration issues, look for these log entries:

```
Google Sheets logging initialized successfully
Successfully refreshed Google Sheets authorization
Error logging call data to Google Sheets: [error message]
Attempting to refresh Google Sheets authentication due to error...
```

## Testing the Integration

You can test if your Google Sheets integration is working correctly by:

1. Adding a test call in Resgrid
2. Checking the Google Sheet for the new entry
3. Monitoring logs: `fly logs | grep "Google Sheets"`

## Advanced: Manually Triggering a Refresh

If you need to manually trigger a Google Sheets authentication refresh:

1. SSH into your deployment: `fly ssh console`
2. Stop the service: `kill $(pgrep -f "node listener.js")`
3. Wait a few seconds for Fly.io to restart the service automatically

This will reinitialize the Google Sheets connection.