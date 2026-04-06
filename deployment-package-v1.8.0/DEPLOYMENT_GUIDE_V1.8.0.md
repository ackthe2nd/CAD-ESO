# Deployment Guide v1.8.0
**Resgrid-ESO Bridge Production Deployment**

## Quick Start Deployment

### 1. Environment Setup
Create `.env` file with required credentials:
```bash
# Resgrid API Access
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}
LOG_SHEET_ID=your_google_sheet_id

# ESO SFTP Upload (Optional)
SFTP_HOST=sftp.esosuite.net
SFTP_USER=your_eso_username
SFTP_PASS=your_eso_password
SFTP_DIR=/your_upload_directory
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Service
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Fly.io Production Deployment

### Deploy Commands
```bash
# Build and deploy
fly deploy

# Set environment secrets
fly secrets set RESGRID_USER="your_username"
fly secrets set RESGRID_PASS="your_password"
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account"...}'
fly secrets set LOG_SHEET_ID="your_sheet_id"

# Optional SFTP secrets
fly secrets set SFTP_PASS="your_eso_password"
```

### Monitoring
```bash
# View logs
fly logs

# Check app status
fly status

# Open app
fly open
```

## Google Sheets Setup

### 1. Create Service Account
1. Go to Google Cloud Console
2. Create new service account
3. Download JSON credentials
4. Share Google Sheet with service account email

### 2. Sheet Structure
Required tabs:
- **Call Data**: Emergency call information
- **Logs**: System events and errors

### 3. Permissions
Service account needs Editor access to the spreadsheet.

## System Verification

### Health Check
```bash
# Run comprehensive system check
node system-status-check.js
```

Expected results:
- Authentication: PASS
- Google Sheets: PASS  
- SFTP Connection: PASS
- Data Processing: PASS
- Upload Status: PASS

### Test Processing
```bash
# Test active call processing
node fetch-and-log-active-calls.js

# Verify upload status
node verify-upload-status.js
```

## Troubleshooting

### Common Issues

**API Token Errors**
- Verify RESGRID_USER and RESGRID_PASS
- Check for special characters in password
- Ensure account has API access

**Google Sheets Access**
- Verify service account JSON is valid
- Check sheet sharing permissions
- Confirm LOG_SHEET_ID is correct

**SFTP Connection**
- Test credentials separately
- Verify network connectivity
- Check directory permissions

### Error Resolution

**SignalR Disconnection**
- Service automatically reconnects
- Check network stability
- Monitor logs for connection events

**Upload Failures**
- Review SFTP credentials
- Check file permissions
- Monitor disk space

## Performance Optimization

### Memory Management
- Service uses ~50MB base memory
- Scales with active call volume
- Automatic cleanup of temporary files

### Network Optimization
- Connection pooling for API calls
- Retry logic for failed uploads
- Efficient data processing

## Security Considerations

### Credential Management
- Use environment variables only
- Never commit credentials to code
- Rotate passwords regularly

### Data Protection
- HTTPS for all API communications
- SFTP encryption for file transfers
- Secure Google Sheets access

## Monitoring & Maintenance

### Regular Checks
- Monitor Google Sheets for upload status
- Review system logs for errors
- Verify SFTP connectivity

### Updates
- Test in development environment
- Deploy during low-activity periods
- Monitor post-deployment performance

### Backup Procedures
- Export Google Sheets data regularly
- Maintain environment configuration backup
- Document custom modifications

## Support Resources

### Documentation
- `SYSTEM_STATUS_V1.8.0.md` - Current system health
- `README_V1.8.0.md` - Comprehensive system overview
- `API_REFERENCE.md` - Resgrid API documentation

### Logs Location
- **Production**: Fly.io logs (`fly logs`)
- **Google Sheets**: Logs tab in spreadsheet
- **Local**: Console output

---

**Deployment Version**: 1.8.0  
**Compatibility**: Node.js 18+, Resgrid API v4, ESO XML Standard  
**Last Updated**: June 8, 2025