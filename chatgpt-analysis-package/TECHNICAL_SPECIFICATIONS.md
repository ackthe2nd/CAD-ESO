# Technical Specifications - Resgrid-ESO Bridge

## System Architecture Specifications

### Runtime Environment
- **Platform**: Node.js 18+
- **Memory**: 512MB recommended
- **CPU**: Single core sufficient for typical loads
- **Storage**: 100MB for application, temp space for XML files
- **Network**: Persistent internet connection required

### API Integration Specifications

#### Resgrid API
- **Base URL**: https://api.resgrid.com/api/v4/
- **Authentication**: Bearer token (refreshes every 24 hours)
- **Rate Limits**: Respectful usage, ~1 req/sec
- **Key Endpoints**:
  - `GET /Calls/GetActiveCalls` - Active emergency calls
  - `GET /Calls/GetCallExtraData/{id}` - Detailed call information
  - `GET /Units/GetAllUnitsInfos` - Unit roster data

#### Google Sheets API
- **Version**: v4
- **Authentication**: Service Account JSON
- **Scopes**: `spreadsheets` (read/write)
- **Batch Operations**: Used for performance optimization
- **Rate Limits**: 100 requests/100 seconds/user

#### ESO SFTP
- **Host**: sftp.esosuite.net
- **Port**: 22 (standard SFTP)
- **Directory**: /CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
- **File Format**: XML with ESO schema compliance
- **Transfer**: Encrypted SFTP with retry logic

### Data Processing Specifications

#### Location Extraction Algorithm
```javascript
function extractLocationFromIncidentDetails(incidentDetails) {
  // Input validation
  if (!incidentDetails || typeof incidentDetails !== 'string') return '';
  
  // Primary pattern: Sophisticated address detection
  const locationMatch = incidentDetails.match(
    /LOCATION:\s*([^-\n\r]+?)(?:\s*-\s*(?:\d|\w+\s+\w+|\w+,|\w+\s+\w+\s+\w+|ALERTS))/i
  );
  
  if (locationMatch && locationMatch[1]) {
    let location = locationMatch[1].trim();
    location = location.replace(/[.,;:]+$/, '').trim();
    return location.length >= 3 ? location : '';
  }
  
  // Fallback pattern: Simple extraction with filtering
  const fallbackMatch = incidentDetails.match(/LOCATION:\s*([^-\n\r]+?)(?:\s*-|$)/i);
  if (fallbackMatch && fallbackMatch[1]) {
    let location = fallbackMatch[1].trim();
    
    // Skip address-like strings (starting with numbers)
    if (/^\d/.test(location)) return '';
    
    location = location.replace(/[.,;:]+$/, '').trim();
    return location.length >= 3 ? location : '';
  }
  
  return '';
}
```

#### XML Schema Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>{CallId}</IncidentNumber>
  <CallReceivedDateTime>{ISO8601}</CallReceivedDateTime>
  <IncidentAddress>{ParsedAddress}</IncidentAddress>
  <GPSLocation>
    <Latitude>{DecimalDegrees}</Latitude>
    <Longitude>{DecimalDegrees}</Longitude>
  </GPSLocation>
  <Units>
    <Unit>
      <UnitNumber>{UnitName}</UnitNumber>
      <DispatchTime>{ISO8601}</DispatchTime>
      <EnRouteTime>{ISO8601}</EnRouteTime>
      <ArrivalTime>{ISO8601}</ArrivalTime>
      <ClearTime>{ISO8601}</ClearTime>
    </Unit>
  </Units>
</CadIncident>
```

### Google Sheets Schema

#### Call Data Sheet Structure
```
Column A: Call Received Time (Pacific Time format: 2025-06-08 19:37:09)
Column B: Emergency Call ID (Resgrid CallId)
Column C: Priority Description (Emergency/Non-Emergency)
Column D: Responding Units (Comma-separated list)
Column E: Call Title (Incident summary)
Column F: Incident Type (Extracted from Nature field)
Column G: Incident Details (Full Nature text)
Column H: Emergency Address (Parsed full address)
Column I: Location (EXTRACTED DESCRIPTION ONLY - Fixed in v2.1.3)
Column J: Address Line 1 (Street address)
Column K: Address Line 2 (Suite/Apt)
Column L: City
Column M: State
Column N: ZIP Code
Column O: GPS Latitude
Column P: GPS Longitude
... (Additional 22 columns for unit times, patient info, status tracking)
```

### Performance Benchmarks

#### Response Times
- SignalR event processing: < 2 seconds
- Google Sheets write: 300ms average
- XML generation: < 1 second
- SFTP upload: 2-5 seconds
- End-to-end processing: < 10 seconds

#### Throughput Capacity
- Concurrent calls: 50+ simultaneous
- Daily volume: 1000+ incidents
- XML file size: 1500-2200 bytes typical
- Memory usage: < 100MB steady state

### Error Handling Specifications

#### Retry Logic
- **SFTP uploads**: 3 attempts with exponential backoff
- **API calls**: 3 attempts with 1-second intervals
- **Google Sheets**: 3 attempts with authentication refresh
- **SignalR**: Automatic reconnection with circuit breaker

#### Fault Tolerance
- **Component isolation**: Individual component failures don't crash system
- **Graceful degradation**: System continues with reduced functionality
- **State recovery**: Resumption after temporary failures
- **Comprehensive logging**: All errors logged with context

### Security Specifications

#### Authentication
- **Resgrid**: Username/password → Bearer token
- **Google Sheets**: Service Account JSON key
- **ESO SFTP**: Username/password over encrypted connection
- **Token rotation**: Automatic refresh before expiration

#### Data Protection
- **Credentials**: Environment variables only
- **Network**: TLS/SSL for all communications
- **Storage**: Temporary files in secure directory
- **Access control**: Principle of least privilege

### Monitoring Specifications

#### Health Endpoints
- `GET /health`: System status and version
- `GET /status`: Detailed component status
- `GET /test/{callId}`: On-demand call processing test

#### Metrics Collection
- **Performance**: Response times, throughput
- **Reliability**: Success rates, error counts
- **Resource usage**: Memory, CPU, network
- **Business metrics**: Calls processed, locations extracted

### Configuration Management

#### Environment Variables
```bash
# Required Core Configuration
RESGRID_USER=username
RESGRID_PASS=password
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
LOG_SHEET_ID=spreadsheet_id
SFTP_HOST=sftp.esosuite.net
SFTP_USER=CA-EMS
SFTP_PASS=password

# Optional Tuning Parameters
NODE_ENV=production
PORT=5000
LOG_LEVEL=info
POLLING_INTERVAL=60000
XML_INTEGRITY_CHECK=true
TIMEZONE=America/Los_Angeles
```

#### Feature Flags
- **XML_INTEGRITY_CHECK**: Enable post-upload verification
- **BACKUP_POLLING**: Enable polling backup mechanism
- **DEBUG_LOGGING**: Enhanced logging for troubleshooting
- **LOCATION_EXTRACTION**: Enable Location column processing

This system processes real emergency call data with production-grade reliability, comprehensive error handling, and optimized performance for emergency services operations.