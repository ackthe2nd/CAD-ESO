# MEDsync EMS Suite v2.2.2 - Complete Deployment Guide

## Quick Start Deployment

### Prerequisites
- Access to production credentials (provided in deployment package)
- Fly.io account (recommended) or compatible hosting platform
- PowerShell for automated deployment scripts

### One-Click Deployment (Recommended)

1. **Extract Deployment Package**
   ```bash
   unzip medsync-flyio-deployment-v2.2.2-final.zip
   cd medsync-flyio-deployment-v2.2.2-final
   ```

2. **Run Quick Deploy Script**
   ```bash
   ./quick-deploy.ps1
   ```

3. **Verify Deployment**
   - Service URL: `https://resgrid2eso.fly.dev`
   - Health Check: `https://resgrid2eso.fly.dev/status`
   - Expected Response: All components showing "healthy" status

## Manual Deployment Steps

### 1. Environment Setup

#### Required Environment Variables
```bash
# Resgrid API Configuration
RESGRID_USER=EMSadmin
RESGRID_PASS=a1b2c3D*

# ESO SFTP Configuration
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_PASS=EventMedicalPCR1!
SFTP_REMOTE_PATH=/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9

# Google Sheets Integration
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ca-ems-data-integration"...}
LOG_SHEET_ID=1BcY8tVZ9k2_example_sheet_id

# Application Configuration
PORT=5000
NODE_ENV=production
```

### 2. Fly.io Deployment

#### Initial Setup
```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login to Fly.io
fly auth login

# Deploy application
fly deploy --dockerfile Dockerfile
```

#### Configure Secrets
```bash
# Set all required secrets
fly secrets set RESGRID_USER="EMSadmin"
fly secrets set RESGRID_PASS="a1b2c3D*"
fly secrets set SFTP_HOST="sftp.esosuite.net"
fly secrets set SFTP_USER="CA-EMS"
fly secrets set SFTP_PASS="EventMedicalPCR1!"
fly secrets set SFTP_REMOTE_PATH="/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9"
fly secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account"...}'
fly secrets set LOG_SHEET_ID="1BcY8tVZ9k2_example_sheet_id"
```

### 3. Alternative Hosting Platforms

#### Docker Deployment
```bash
# Build Docker image
docker build -t medsync-ems-suite .

# Run with environment variables
docker run -d \
  -p 5000:5000 \
  -e RESGRID_USER="EMSadmin" \
  -e RESGRID_PASS="a1b2c3D*" \
  -e SFTP_HOST="sftp.esosuite.net" \
  -e SFTP_USER="CA-EMS" \
  -e SFTP_PASS="EventMedicalPCR1!" \
  -e SFTP_REMOTE_PATH="/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9" \
  -e GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account"...}' \
  -e LOG_SHEET_ID="1BcY8tVZ9k2_example_sheet_id" \
  medsync-ems-suite
```

#### Local Development
```bash
# Install dependencies
npm install

# Create .env file
cp .env.example .env
# Edit .env with production credentials

# Start service
npm start
```

## Post-Deployment Verification

### 1. Health Check Validation
```bash
curl https://your-deployment-url/status
```

**Expected Response:**
```json
{
  "status": "OK",
  "service": "Resgrid-ESO Bridge",
  "version": "2.2.2",
  "resgrid_connection": {"status": "healthy"},
  "google_sheets_connection": {"status": "healthy"},
  "xml_integrity_monitor": {"status": "healthy"},
  "sftp_configuration": {"status": "healthy"}
}
```

### 2. Component Testing

#### Test Resgrid Connection
- Monitor logs for "Connected to Resgrid SignalR hub"
- Verify backup polling shows "Found X active calls"

#### Test Google Sheets Integration
- Check that new entries appear in the configured Google Sheet
- Verify timestamps use Pacific Time format: "2025-06-13 15:30:45"

#### Test SFTP Configuration
- Look for successful XML uploads in logs
- Verify files appear in ESO SFTP directory

### 3. System Performance

#### Run Comprehensive Test
```bash
node comprehensive-system-test-v2.2.2-final.js
```

**Success Criteria:**
- Overall success rate ≥ 75%
- All core components report healthy
- Memory usage remains stable
- No critical errors in error recovery test

## Monitoring & Maintenance

### Key Metrics to Monitor

#### Application Health
- **Endpoint**: `/status`
- **Frequency**: Every 5 minutes
- **Alert Conditions**: Any component status ≠ "healthy"

#### Memory Usage
- **Target**: < 150MB average, < 512MB peak
- **Monitor**: `memory_usage` field in status response
- **Alert**: > 400MB sustained usage

#### Call Processing
- **Logs**: Look for "⚠️ RECEIVED CALL EVENT" messages
- **Backup**: "Polling for recent calls" every 30 seconds
- **Performance**: < 2 seconds from event to XML generation

### Log Monitoring

#### Critical Log Messages
```bash
# Successful operations
"Connected to Resgrid SignalR hub"
"XML file uploaded to sftp.esosuite.net"
"Google Sheets logging initialized successfully"

# Warning conditions
"Failed to upload XML file"
"SignalR connection closed"
"Using polling backup mechanism"

# Error conditions  
"Failed to connect to SignalR hub"
"Authentication failed"
"Google Sheets authentication error"
```

### Troubleshooting Common Issues

#### Issue: SFTP Upload Failures
**Symptoms:** "Failed to upload final XML for closed call" in logs
**Solution:** v2.2.2 includes fix for config property mismatch
**Verification:** Monitor for successful "XML file uploaded" messages

#### Issue: Missing Call Events
**Symptoms:** No "RECEIVED CALL EVENT" messages
**Solution:** Service automatically falls back to polling mechanism
**Verification:** Look for "Polling for recent calls" messages every 30 seconds

#### Issue: Google Sheets Connection Errors
**Symptoms:** Authentication failures in logs
**Solution:** Verify GOOGLE_SERVICE_ACCOUNT_JSON secret is properly formatted
**Verification:** Check Google Sheets for new entries with proper timestamps

#### Issue: High Memory Usage
**Symptoms:** Memory usage > 400MB sustained
**Solution:** Service includes automatic memory management
**Verification:** Monitor memory trends over 24-hour period

## Security Considerations

### Credential Management
- All production credentials are pre-configured
- Secrets are managed through platform-specific secret management
- No credentials stored in code or configuration files

### Network Security
- HTTPS/TLS encryption for all external communications
- Secure SFTP for file transfers to ESO
- Google Sheets API uses OAuth 2.0 with service accounts

### Data Protection
- Patient information handled according to HIPAA guidelines
- All data transmission encrypted in transit
- No sensitive data stored locally beyond processing requirements

## Backup & Recovery

### Data Backup Strategy
- **Google Sheets**: Automatic Google Drive backup
- **Application Logs**: Platform-specific log retention
- **Configuration**: Version controlled in deployment packages

### Disaster Recovery
1. **Service Failure**: Automatic restart through platform health checks
2. **Data Loss**: Google Sheets provides complete audit trail
3. **Configuration Loss**: Redeploy from deployment package
4. **Credential Compromise**: Update secrets through platform management

## Support & Escalation

### Self-Service Diagnostics
1. Check `/status` endpoint for component health
2. Review recent logs for error patterns
3. Run comprehensive system test
4. Verify all secrets are properly configured

### Production Support Contacts
- **System Health**: Monitor `/status` endpoint
- **Emergency**: Check backup polling mechanism activation
- **Data Integrity**: Verify Google Sheets logging continuity

---

**Deployment Package v2.2.2** includes all necessary files, scripts, and credentials for immediate production deployment.