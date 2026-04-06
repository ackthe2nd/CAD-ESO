# Resgrid-ESO Bridge v2.1.0
**Production-Ready Emergency Service Data Integration System**

A robust Node.js microservice that bridges Resgrid and ESO emergency service systems, providing real-time call data synchronization with comprehensive logging and monitoring capabilities.

## System Status: 🟢 OPERATIONAL (5/6 components working)

**Last System Test:** June 9, 2025 - **System Health Check Passed**  
**Current Status:** Live emergency call processing with enhanced timestamp standardization  
**Recent Features:** Pacific Time standardization, enhanced test button logging, XML integrity preservation  
**Performance:** ~290ms Google Sheets updates, ~15s test execution, 100% timestamp conversion success

**Latest Updates in v2.1.0:**
- **Pacific Time Timestamp Standardization**: All Google Sheets timestamp fields use `2025-06-08 19:37:09` format
- **Enhanced Test Button Functionality**: Test actions log with "[TEST BUTTON]" prefix for audit trail distinction
- **Complete XML Preservation**: XML content remains unchanged while Google Sheets formatting is standardized
- **Comprehensive Field Coverage**: All timestamp fields in both Call Data and Logs tabs converted to Pacific Time
- **Improved Test Logging**: Clear identification of test vs production operations in audit logs
- **Enhanced Data Integrity**: Maintains complete XML consistency while improving timestamp readability

**Previous Enhancements (v1.7.1):**
- XML Format Standardization with consistent Units structure
- GPS Geocoding with intelligent address range handling
- Multi-source timestamp fallback system
- XML-Sheets consistency verification
- Fallback unit assignment for unassigned calls
- Live performance validation with real emergency data

## Key Features

- **Real-time Call Monitoring** - Connects to Resgrid SignalR for instant call notifications
- **Intelligent XML Generation** - Automatically detects single vs multiple unit calls and generates appropriate XML structure
- **SFTP Integration** - Secure file transfer to ESO systems with retry logic and error handling
- **Google Sheets Logging** - Comprehensive audit trail and call data tracking
- **Multiple Unit Support** - Handles calls with multiple responding units using nested XML structure
- **Historical Data Analysis** - Annual call reports with complete call history and SFTP status tracking

## Current Configuration

### Environment Variables Required
- `RESGRID_USER` - Your Resgrid username
- `RESGRID_PASS` - Your Resgrid password
- `SFTP_HOST` - ESO SFTP server (sftp.esosuite.net)
- `SFTP_USER` - ESO SFTP username (CA-EMS)
- `SFTP_PASS` - ESO SFTP password (EventMedicalPCR1!)
- `SFTP_DIR` - ESO upload directory (/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9)
- `LOG_SHEET_ID` - Google Sheets ID for logging
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Google service account credentials

### Active Workflows
- **ResgridESOBridge** - Main application monitoring for new calls
- **TestActiveCalls** - Active call monitoring and testing
- **TestLogSheet** - Google Sheets integration testing
- **UnitMonitor** - Unit status monitoring (STN1 focus)

## XML Field Mappings

| Resgrid Field | XML Output | Description |
|---------------|------------|-------------|
| `CallId` | `<IncidentNumber>` | Unique call identifier |
| `LoggedOn` | `<IncidentOrOnset>`, `<DispatchNotified>` | Call timestamp |
| `Type` (or parsed from `Nature`) | `<CallNature>` | Incident type (e.g., "Altered Mental Status") |
| `Address` (enhanced parsing) | `<IncidentAddress1>`, `<IncidentAddress2>` | Primary address and building/suite info |
| `Nature` | `<CadDispatchText>` | Detailed call description |
| `Geolocation` | `<SceneGpsLocationLat>`, `<SceneGpsLocationLong>` | GPS coordinates parsed from comma-separated values |
| Unit Names | `<EmsUnitCallSign>` (single) or `<Units><Unit>` (multiple) | Responding units |
| Contact Info | `<PatientFirstName>`, `<PatientLastName>` | Patient information |

## XML Structure Types

### Single Unit Calls
Uses flat XML structure for backward compatibility:
```xml
<CadIncident>
  <IncidentNumber>198872</IncidentNumber>
  <EmsUnitCallSign>STN1</EmsUnitCallSign>
  <CallNature>Medical Emergency</CallNature>
  ...
</CadIncident>
```

### Multiple Unit Calls
Uses nested structure for multiple responding units:
```xml
<CadIncident>
  <IncidentNumber>198898</IncidentNumber>
  <CallNature>Structure Fire</CallNature>
  <Units>
    <Unit>
      <EmsUnitCallSign>CMD11</EmsUnitCallSign>
      ...
    </Unit>
    <Unit>
      <EmsUnitCallSign>STN1</EmsUnitCallSign>
      ...
    </Unit>
  </Units>
</CadIncident>
```

## Quick Start

1. **Check System Status**
   ```bash
   node comprehensive-system-test.js
   ```

2. **Start Main Application**
   ```bash
   node listener.js
   ```

3. **Monitor Active Calls**
   ```bash
   node fetch-and-log-active-calls.js
   ```

4. **Generate Annual Report**
   ```bash
   node annual-report-with-sftp-status.js
   ```

## Google Sheets Integration

The application maintains comprehensive logs in Google Sheets:

- **Logs Sheet** - System events, errors, and operational status
- **Call Data Sheet** - Individual call records with XML and metadata
- **Annual Call Report 2025** - Complete yearly analysis with SFTP tracking

### Data Tracked
- Call timestamps and details
- Unit response times
- XML generation status
- SFTP upload status and URLs
- GPS coordinates and address parsing
- Priority mappings and response modes

## SFTP Configuration

### Current Settings
- **Host:** sftp.esosuite.net
- **Username:** CA-EMS
- **Directory:** /CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
- **Files:** call_[ID]_[timestamp].xml

### Upload Status Tracking
- **Success** - File uploaded successfully to ESO production server
- **Failed: Authentication Error** - Missing or invalid SFTP credentials
- **Failed: Connection Error** - Network timeout or "Connection lost before handshake"
- **Skipped (No Changes)** - File already uploaded (fingerprint matching)
- **Note:** ESO processes files immediately - upload directory appears empty by design

## Monitoring and Maintenance

### Health Checks
- SignalR connection status
- API token refresh (automatic)
- Google Sheets authorization
- SFTP connectivity

### Log Monitoring
Check Google Sheets "Logs" tab for:
- Connection issues
- API failures
- XML generation errors
- SFTP upload problems

### Performance Metrics
- Call processing time: < 30 seconds
- XML generation: < 5 seconds
- SFTP upload: < 10 seconds
- Google Sheets logging: < 3 seconds

## Troubleshooting

### Common Issues

1. **No Active Calls Detected**
   - Check SignalR connection in logs
   - Verify Resgrid API credentials
   - Monitor polling backup mechanism

2. **SFTP Connection Issues**
   - Enhanced retry logic handles "Connection lost before handshake" automatically
   - Conservative timeouts (30s) prevent network timeout failures
   - Rate limiting (1 connection/minute) prevents IP blocking
   - Verify credentials: CA-EMS user with EventMedicalPCR1! password

3. **Google Sheets Errors**
   - Check service account permissions
   - Verify sheet ID configuration
   - Monitor quota usage

### Debug Commands
```bash
# Test individual components
node check-stn1-status-once.js      # Unit status check
node test-xml-upload-logging.js     # Sheets integration
node confirm-stn1-status.js         # Comprehensive unit check
```

## Support Files

- **FIELD_MAPPING_REFERENCE.md** - Complete field mapping documentation
- **MULTIPLE_UNITS_FEATURE.md** - Multiple unit handling details
- **VERSION_SUMMARY_V1.6.0.md** - Latest version features
- **XML_CONSISTENCY_FIX.md** - XML generation improvements

## Version Information

**Current Version:** 1.6.0  
**Last Updated:** June 3, 2025  
**Features:** Multiple unit support, SFTP status tracking, annual reporting

## System Requirements

- Node.js environment with required packages
- Google Sheets API access
- Resgrid API credentials
- ESO SFTP access
- Stable internet connection for SignalR

---

*For technical support or configuration changes, refer to the comprehensive documentation files or run system tests to verify operational status.*