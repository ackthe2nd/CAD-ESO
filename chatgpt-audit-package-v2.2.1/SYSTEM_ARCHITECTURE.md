# System Architecture - Resgrid-ESO Bridge v2.2.1

## High-Level Architecture

```
┌─────────────────┐    SignalR     ┌──────────────────┐    XML/SFTP    ┌─────────────┐
│   Resgrid API   │◄──────────────►│  Bridge Service  │───────────────►│ ESO Server  │
│                 │                │                  │                │             │
│ Emergency Calls │                │ - Call Processing│                │ Patient Care│
│ Unit Status     │                │ - XML Generation │                │ Records     │
│ Real-time Events│                │ - Closure Detection              │             │
└─────────────────┘                └────────┬─────────┘                └─────────────┘
                                           │
                                           │ Google Sheets API
                                           ▼
                                   ┌─────────────────┐
                                   │ Google Sheets   │
                                   │                 │
                                   │ - Call Data Log │
                                   │ - System Events │
                                   │ - Upload Status │
                                   └─────────────────┘
```

## Core Components

### 1. Event Processing Engine (src/index.js)
**Purpose**: Main orchestration and event handling
**Key Functions**:
- SignalR connection management with automatic reconnection
- Real-time event processing (CallAdded, CallClosed, UnitStatusSet)
- Polling backup mechanism (30-second intervals)
- Duplicate prevention with processed call tracking
- Call closure detection with state transition monitoring

**Data Flow**:
1. Receives real-time events from Resgrid SignalR
2. Fetches additional call data via REST API
3. Creates call snapshots for change detection
4. Processes calls through XML generation pipeline
5. Uploads to ESO and logs to Google Sheets

### 2. XML Generation Service (src/xml-generator.js)
**Purpose**: Converts Resgrid call data to ESO-compliant XML
**Key Functions**:
- ESO schema compliance with proper namespaces
- Field mapping between Resgrid and ESO formats
- Address parsing and geocoding integration
- Unit information extraction and formatting
- Patient data handling with DOB extraction
- Timestamp conversion to ESO format

**XML Structure**:
```xml
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>{ESO-GUID}</Guid>
  <IncidentNumber>{CallId}</IncidentNumber>
  <IncidentOrOnset>{Timestamp}</IncidentOrOnset>
  <ComplaintReportedByDispatch>{Nature}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>{Address}</VehicleDispatchLocation>
  <EmsUnitCallSign>{Units}</EmsUnitCallSign>
  <!-- Additional fields based on call data -->
</CadIncident>
```

### 3. Google Sheets Integration (src/sheets-logger.js)
**Purpose**: Comprehensive logging and monitoring
**Key Functions**:
- Service account authentication
- Call data logging with 37+ fields
- System event logging with timestamps
- Upload status tracking
- Error reporting and monitoring

**Sheet Structure**:
- **Call Data Sheet**: Complete call information with lifecycle tracking
- **Logs Sheet**: System events, errors, and status updates

### 4. SFTP Upload Manager
**Purpose**: Reliable file transfer to ESO
**Key Functions**:
- Fly.io optimized connection handling
- Retry logic with exponential backoff
- Connection pooling and cleanup
- Error handling and logging
- File integrity verification

## Data Flow Architecture

### Real-time Processing Pipeline
1. **Event Reception**: SignalR receives CallAdded event
2. **Data Enrichment**: Fetch additional call details via API
3. **Change Detection**: Compare with previous call snapshot
4. **XML Generation**: Create ESO-compliant XML
5. **SFTP Upload**: Transfer to ESO server
6. **Logging**: Record all actions in Google Sheets

### Closure Detection Pipeline
1. **State Monitoring**: Track call state changes
2. **Closure Detection**: Identify Active→Closed transitions
3. **Final XML Generation**: Include closure timestamps
4. **Final Upload**: Send closure XML to ESO
5. **Audit Logging**: Complete lifecycle documentation

## Configuration Management

### Environment Variables
```
# Authentication
RESGRID_USER=emergency_dept_username
RESGRID_PASS=secure_password

# ESO Integration
SFTP_HOST=sftp.esosuite.net
SFTP_USER=department_code
SFTP_PASS=sftp_password
SFTP_DIR=/department/upload/directory

# Google Sheets
GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account"...}
LOG_SHEET_ID=spreadsheet_id

# Performance Tuning
POLLING_INTERVAL=30000
MAX_RETRIES=3
SFTP_TIMEOUT=30000
```

### Security Considerations
- Environment variables for sensitive data
- Google Service Account with limited permissions
- SFTP over secure connection
- No hardcoded credentials in source code
- Token refresh with error handling

## Error Handling Strategy

### Graceful Degradation
- SignalR failure → Polling backup
- API errors → Cached data usage
- SFTP issues → Retry with backoff
- Google Sheets rate limits → Queue management

### Error Recovery
- Automatic token refresh
- Connection retry logic
- Duplicate prevention
- State recovery on restart

## Performance Characteristics

### Current Metrics
- Memory Usage: ~143MB RSS
- Response Time: <100ms for health checks
- Call Processing: 6.4 seconds end-to-end
- Uptime: 400+ seconds stable operation

### Scalability Considerations
- Stateless design for horizontal scaling
- Connection pooling for external services
- Efficient memory management
- Configurable performance parameters

## Monitoring and Observability

### Health Endpoints
- `/status` - System health and feature status
- `/integrity` - XML upload verification
- `/test/{callId}` - End-to-end testing

### Logging Strategy
- Structured logging with timestamps
- Different log levels (info, warn, error, debug)
- Google Sheets integration for audit trail
- Performance metrics tracking

## Deployment Architecture

### Fly.io Platform
- Container-based deployment
- Automatic scaling and health checks
- Environment variable management
- Secret handling and rotation

### Dependencies
- Node.js runtime environment
- External API connectivity
- SFTP client capabilities
- Google Sheets API access

This architecture ensures reliable emergency call processing with comprehensive monitoring and error recovery capabilities.