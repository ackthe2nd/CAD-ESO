# Resgrid to ESO Bridge - Deployment Guide

This guide covers deployment procedures, operational monitoring, and maintenance protocols for the Resgrid to ESO Bridge application.

## Pre-Deployment Checklist

### System Requirements Verification

Run the comprehensive test suite:
```bash
node comprehensive-system-test.js
```

Expected results: 11/11 tests passed (100% success rate)
- Environment Variables: PASS
- Core Files: PASS  
- Resgrid Authentication: PASS
- Google Sheets Authentication: PASS
- Resgrid API Endpoints: PASS
- XML Generation: PASS
- Google Sheets Write: PASS
- SFTP Connection Stability: PASS
- ESO Production Integration: PASS
- Address Parsing System: PASS
- Dynamic Column Mapping: PASS

### Configuration Verification

Verify all required environment variables:
```bash
# Check configuration display
node confirm-stn1-status.js
```

Required settings:
- RESGRID_USER: Set
- RESGRID_PASS: Set
- SFTP_HOST: sftp.esosuite.net
- SFTP_USER: CA-EMS
- SFTP_DIR: /CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
- LOG_SHEET_ID: Valid Google Sheets ID
- GOOGLE_SERVICE_ACCOUNT_JSON: Valid service account

## Deployment Procedures

### Production Deployment

1. **Pre-deployment Testing**
   ```bash
   # Test all components
   node test-xml-upload-logging.js
   node fetch-and-log-active-calls.js
   node annual-report-with-sftp-status.js
   ```

2. **Start Production Services**
   ```bash
   # Primary service
   node listener.js
   
   # Or use Replit workflows (recommended)
   # Workflow: ResgridESOBridge
   ```

3. **Verify Service Health**
   - Check SignalR connection establishment
   - Monitor initial API token acquisition
   - Verify Google Sheets logging functionality
   - Confirm polling backup mechanism

### Workflow Management

#### Active Workflows
- **ResgridESOBridge** - Main production service
- **TestActiveCalls** - Call monitoring verification
- **TestLogSheet** - Google Sheets integration test
- **UnitMonitor** - Unit status monitoring

#### Starting Workflows
```bash
# Restart specific workflow if needed
# Use Replit workflow controls or:
node listener.js              # ResgridESOBridge
node fetch-and-log-active-calls.js  # TestActiveCalls
node test-xml-upload-logging.js     # TestLogSheet
node confirm-stn1-status.js        # UnitMonitor
```

## Operational Monitoring

### Real-time Monitoring

#### SignalR Connection Status
Monitor logs for:
```
Connected to Resgrid SignalR hub. ConnectionId: [ID]
Registered callback for CallAdded and other events
Service started successfully
```

#### Call Processing Flow
1. Call detection via SignalR or polling
2. API calls to fetch call details
3. XML generation (single or multiple unit format)
4. SFTP upload attempt
5. Google Sheets logging

#### Performance Metrics
- Call detection: < 10 seconds from Resgrid event
- XML generation: < 5 seconds
- SFTP upload: < 10 seconds (when password configured)
- Google Sheets logging: < 3 seconds

### Google Sheets Monitoring

#### Logs Sheet Columns
- Timestamp - Event occurrence time
- Level - info, error, warning
- Message - Event description
- Status - Call processing status
- XML - XML content (truncated for large files)

#### Call Data Sheet Tracking
- Call ID, timestamp, nature, units
- Response times (en route, on scene, cleared)
- XML generation status
- SFTP upload status and URLs

#### Annual Report Analysis
- Complete call history with metadata
- SFTP status tracking per call
- Unit response analysis
- XML structure validation

### SFTP Upload Monitoring

#### Status Categories
- **Success** - File uploaded successfully to ESO production server
- **Failed: Authentication Error** - Invalid SFTP credentials (CA-EMS/EventMedicalPCR1!)
- **Failed: Connection Error** - Network timeout or "Connection lost before handshake"
- **Skipped (No Changes)** - File already exists (fingerprint match)
- **Note:** ESO processes uploaded files immediately - directory appears empty by design

#### Upload Destinations
Files uploaded to: `sftp://sftp.esosuite.net/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9/call_[ID]_[timestamp].xml`

#### Enhanced Connection Stability (v1.6.1)
- Conservative connection timeouts (30 seconds) prevent network failures
- Automatic retry logic for "Connection lost before handshake" errors
- Rate limiting (1 connection per minute) prevents IP blocking
- IPv4-only connections for improved compatibility

#### XML Format Verification (CRITICAL)
- **VERIFIED**: All production XML uses correct `<CadIncident>` root node format
- **FIXED**: Test scripts updated to use proper XML structure
- **CONFIRMED**: ESO processing compatibility ensured
- All uploads since deployment use ESO-compatible XML format

## Maintenance Procedures

### Daily Monitoring

1. **Check Service Health**
   ```bash
   # Verify all workflows running
   # Check Google Sheets for recent activity
   # Review error logs for issues
   ```

2. **Call Processing Verification**
   - Recent calls processed successfully
   - XML generation working correctly
   - No authentication failures

### Weekly Maintenance

1. **Performance Review**
   - Google Sheets log analysis
   - SFTP upload success rates
   - API response times

2. **System Health Check**
   ```bash
   node comprehensive-system-test.js
   ```

### Monthly Procedures

1. **Log Archival**
   - Archive old Google Sheets data if needed
   - Clean up temporary files
   - Review storage usage

2. **Configuration Review**
   - Verify all credentials still valid
   - Check for API changes or updates
   - Review performance metrics

## Troubleshooting Procedures

### SignalR Connection Issues

**Symptoms:**
- No new calls detected
- Connection errors in logs
- Relying only on polling backup

**Resolution:**
1. Check Resgrid API credentials
2. Verify network connectivity
3. Monitor for API rate limiting
4. Restart ResgridESOBridge workflow

### SFTP Upload Failures

**Symptoms:**
- "Failed: Authentication Error" in logs
- SFTP connection timeouts
- Files not appearing in ESO

**Resolution:**
1. Verify SFTP password in Replit Secrets
2. Test ESO server connectivity
3. Check upload directory permissions
4. Contact ESO support if server issues

### Google Sheets Integration Problems

**Symptoms:**
- Missing log entries
- Authentication errors
- Quota exceeded messages

**Resolution:**
1. Verify service account permissions
2. Check Google Sheets API quota
3. Confirm sheet sharing settings
4. Test authentication manually

### XML Generation Errors

**Symptoms:**
- Malformed XML in logs
- Missing call data fields
- Processing failures

**Resolution:**
1. Check call data completeness
2. Verify field mapping logic
3. Test with known good call data
4. Review address parsing

## Emergency Procedures

### Service Outage Response

1. **Immediate Actions**
   - Check all workflow status
   - Review recent error logs
   - Verify external service availability

2. **Service Recovery**
   ```bash
   # Restart all workflows
   node comprehensive-system-test.js
   node listener.js
   ```

3. **Data Recovery**
   - Check for missed calls during outage
   - Manually process any missed events
   - Verify data integrity

### API Credential Compromise

1. **Immediate Response**
   - Change Resgrid password
   - Update SFTP credentials
   - Rotate Google service account key

2. **System Update**
   - Update environment variables
   - Restart all services
   - Monitor for unauthorized access

## Performance Optimization

### Monitoring Metrics

Track these key performance indicators:
- Average call processing time
- SFTP upload success rate
- API response times
- Google Sheets write performance

### Optimization Strategies

1. **API Efficiency**
   - Monitor token refresh frequency
   - Optimize polling intervals
   - Batch Google Sheets operations

2. **SFTP Performance**
   - Use fingerprint caching to avoid duplicate uploads
   - Implement proper retry logic
   - Monitor upload queue

3. **Memory Management**
   - Regular application restarts if needed
   - Monitor memory usage trends
   - Clean up temporary files

## Backup and Recovery

### Data Backup Strategy

1. **Google Sheets Data**
   - Automatic cloud backup via Google
   - Regular export for offline storage
   - Version history available

2. **Configuration Backup**
   - Document all environment variables
   - Store service account keys securely
   - Maintain deployment documentation

### Recovery Procedures

1. **Service Recovery**
   - Redeploy from source code
   - Restore configuration
   - Verify all integrations

2. **Data Recovery**
   - Use Google Sheets revision history
   - Reconstruct missing call data from Resgrid
   - Validate data integrity

## Scaling Considerations

### Load Management

Current system handles:
- Real-time call monitoring
- Concurrent SFTP uploads
- Google Sheets logging
- Annual report generation

### Future Enhancements

Potential improvements:
- Multiple department support
- Enhanced error recovery
- Advanced analytics
- Custom field mappings

---

**Support Contacts:**
- Resgrid API: support@resgrid.com
- ESO SFTP: Contact your ESO administrator
- Google Sheets: Google Cloud Support