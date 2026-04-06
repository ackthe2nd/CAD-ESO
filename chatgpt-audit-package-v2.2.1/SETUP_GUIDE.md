# Resgrid to ESO Bridge - Complete Setup Guide

This guide provides step-by-step instructions for setting up and deploying the Resgrid to ESO Bridge application.

## Prerequisites

- Resgrid API account with valid credentials
- ESO system with SFTP access
- Google account for Sheets integration
- Node.js environment (provided by Replit)

## Step 1: Environment Configuration

### Required Environment Variables

Set these in your Replit environment or `.env` file:

```bash
# Resgrid API Credentials
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# ESO SFTP Configuration
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_PASS=EventMedicalPCR1!
SFTP_DIR=/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9

# Google Sheets Integration
LOG_SHEET_ID=your_google_sheet_id
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Optional Settings
POLL_MS=60000  # Polling interval in milliseconds
```

### Sensitive Credentials (Replit Secrets)

For production deployment, store sensitive values in Replit Secrets:

1. Go to Replit Secrets tab
2. Add these secret keys:
   - `SFTP_PASS` - Your ESO SFTP password
   - `GOOGLE_SERVICE_ACCOUNT_JSON` - Complete service account JSON
   - `LOG_SHEET_ID` - Google Sheets document ID

## Step 2: Google Sheets Setup

### Create Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable Google Sheets API
4. Create service account:
   - Go to IAM & Admin > Service Accounts
   - Click "Create Service Account"
   - Name: `resgrid-eso-bridge`
   - Role: Editor
   - Download JSON key file

### Configure Google Sheet

1. Create new Google Sheet
2. Share with service account email (from JSON file)
3. Grant Editor permissions
4. Copy Sheet ID from URL: `https://docs.google.com/spreadsheets/d/SHEET_ID/edit`

### Required Sheet Tabs

The application will automatically create these tabs:
- **Logs** - System events and errors
- **Call Data** - Individual call records
- **Annual Call Report 2025** - Yearly analysis

## Step 3: Resgrid API Configuration

### Verify API Access

Test your Resgrid credentials:

```bash
node check-resgrid-auth.js
```

### Required API Permissions

Ensure your Resgrid account has access to:
- Calls API (`/api/v4/Calls/GetActiveCalls`)
- Call Details API (`/api/v4/Calls/GetCall`)
- Call Extra Data API (`/api/v4/Calls/GetCallExtraData`)
- SignalR Events Hub (`events.resgrid.com/eventingHub`)

## Step 4: ESO SFTP Configuration

### SFTP Connection Details

Your ESO administrator should provide:
- SFTP hostname (typically `sftp.esosuite.net`)
- Username (format: `CA-EMS`)
- Password
- Upload directory (typically `/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9`)

### Test SFTP Connection

```bash
# Test SFTP connectivity (requires password)
node test-sftp-connection.js
```

### File Format Requirements

XML files uploaded to ESO must:
- Use UTF-8 encoding
- Include required ESO XML schema elements
- Follow naming convention: `call_[ID]_[timestamp].xml`

## Step 5: Application Deployment

### Install Dependencies

```bash
npm install
```

### Run System Tests

```bash
# Comprehensive system verification
node comprehensive-system-test.js

# Individual component tests
node test-xml-upload-logging.js
node fetch-and-log-active-calls.js
node confirm-stn1-status.js
```

### Start Application

```bash
# Main application
node listener.js

# Alternative: Use Replit workflow "ResgridESOBridge"
```

## Step 6: Verification and Monitoring

### Verify Real-time Monitoring

1. Check SignalR connection status in logs
2. Monitor "Logs" sheet for connection events
3. Verify polling backup mechanism

### Test Call Processing

1. Create test call in Resgrid
2. Monitor application logs
3. Check XML generation in Google Sheets
4. Verify SFTP upload attempt

### Monitor Performance

Expected performance metrics:
- Call detection: < 10 seconds
- XML generation: < 5 seconds
- SFTP upload: < 10 seconds
- Google Sheets logging: < 3 seconds

## Step 7: Production Considerations

### Monitoring Setup

Regular checks:
- SignalR connection health
- API token refresh status
- Google Sheets quota usage
- SFTP server connectivity

### Backup Mechanisms

The application includes:
- Polling backup (every 60 seconds)
- Automatic API token refresh
- Retry logic for failed operations
- Comprehensive error logging

### Security Best Practices

- Store all passwords in Replit Secrets
- Use service account for Google Sheets (not personal account)
- Regularly rotate SFTP passwords
- Monitor access logs for unauthorized attempts

## Troubleshooting Common Issues

### SignalR Connection Failures

```bash
# Check connection status
node test-signalr-connection.js

# Common solutions:
- Verify Resgrid credentials
- Check network connectivity
- Monitor for API rate limits
```

### Google Sheets Access Denied

```bash
# Verify service account setup
node test-google-auth.js

# Common solutions:
- Check service account email in sheet sharing
- Verify JSON credentials format
- Ensure Sheets API is enabled
```

### SFTP Upload Failures

```bash
# Test SFTP configuration
node test-sftp-upload.js

# Common solutions:
- Verify SFTP password in secrets
- Check ESO server status
- Confirm upload directory permissions
```

### XML Generation Errors

```bash
# Test XML generation
node test-xml-generation.js

# Common solutions:
- Check call data completeness
- Verify field mappings
- Review address parsing logic
```

## Support and Maintenance

### Regular Maintenance Tasks

Monthly:
- Review Google Sheets logs for errors
- Check SFTP upload success rates
- Monitor API usage and quotas
- Update documentation as needed

Quarterly:
- Review and archive old log data
- Test disaster recovery procedures
- Update credentials if required
- Performance optimization review

### Getting Help

1. Check system logs in Google Sheets
2. Run comprehensive system test
3. Review troubleshooting section
4. Contact Resgrid or ESO support for API/SFTP issues

### Version Updates

When updating the application:
1. Run full system test before deployment
2. Backup current configuration
3. Test with limited call volume first
4. Monitor logs for any new issues
5. Update documentation as needed

---

**Note:** This setup guide assumes a Replit environment. For other platforms, adjust file paths and environment variable configuration accordingly.