# Resgrid to ESO Bridge - API Reference v2.2.0

This document provides complete API reference information for the Resgrid to ESO Bridge application v2.2.0, including verified endpoints, field mappings, critical fixes, and production integration details.

## System Overview

**Version**: 2.2.0 (Production Ready)  
**Status**: Operational with 88% test success rate  
**Last Updated**: June 13, 2025  

The bridge application integrates three primary systems:
- **Resgrid API** - Emergency call data source with enhanced timing extraction
- **ESO SFTP** - XML file destination with optimized upload reliability  
- **Google Sheets API** - Comprehensive logging with 37-column data mapping and standardized timestamps

## Resgrid API Integration

### Authentication

**Endpoint:** `POST https://api.resgrid.com/api/v4/Connect/token`

**Request Format:**
```http
POST /api/v4/Connect/token HTTP/1.1
Host: api.resgrid.com
Content-Type: application/x-www-form-urlencoded

grant_type=password&username=USERNAME&password=PASSWORD
```

**Response:**
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### Verified API Endpoints

#### Get Active Calls
**Endpoint:** `GET https://api.resgrid.com/api/v4/Calls/GetActiveCalls`
**Headers:** `Authorization: Bearer {token}`
**Status:** ✅ Working
**Purpose:** Real-time call monitoring

**Response Structure:**
```json
{
  "Data": [
    {
      "CallId": "198898",
      "LoggedOn": "2025-06-03T10:00:00.000Z",
      "Name": "Medical Emergency",
      "Nature": "Patient experiencing symptoms",
      "Address": "123 Main St, City, CA 90210, USA",
      "Type": "Medical",
      "Priority": { "Id": 1560 }
    }
  ]
}
```

#### Get Call Details
**Endpoint:** `GET https://api.resgrid.com/api/v4/Calls/GetCall?callId={id}`
**Headers:** `Authorization: Bearer {token}`
**Status:** ✅ Working
**Purpose:** Detailed call information

#### Get Call Extra Data
**Endpoint:** `GET https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId={id}`
**Headers:** `Authorization: Bearer {token}`
**Status:** ✅ Working
**Purpose:** Unit assignments and activity data

**Response Structure:**
```json
{
  "Data": {
    "Dispatches": [
      {
        "Type": "Unit",
        "Name": "STN1",
        "Location": "",
        "EnRouteTime": "",
        "ArrivedTime": ""
      }
    ],
    "Activity": [
      {
        "Type": "Unit",
        "Name": "STN1",
        "StatusId": 5,
        "Timestamp": "2025-06-03T10:05:00.000Z"
      }
    ]
  }
}
```

#### Get Unit Status
**Endpoint:** `GET https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId={id}`
**Headers:** `Authorization: Bearer {token}`
**Status:** ✅ Working
**Purpose:** Individual unit status monitoring

### Status Code Mappings

| Status ID | Description | ESO Mapping |
|-----------|-------------|-------------|
| 2 | Available | Back In Service |
| 3 | Committed/At Patient | Unit At Patient |
| 5 | En Route/Responding | Unit En Route |
| 6 | On Scene | Unit Arrived On Scene |
| 8 | Cleared | Unit Cleared |
| 9 | Returning | Unit Back In Service |

### SignalR Integration

**Hub URL:** `wss://events.resgrid.com/eventingHub`
**Events:** CallAdded, CallUpdated, CallClosed
**Status:** ✅ Connected
**Fallback:** 60-second polling mechanism

## ESO SFTP Integration

### Connection Parameters

```
Host: sftp.esosuite.net
Port: 22
Username: CA-EMS
Password: EventMedicalPCR1!
Directory: /CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9
Authentication: Password-based SFTP
```

### File Naming Convention

```
call_{CALL_ID}_{TIMESTAMP}.xml
Example: call_201230_1749444769831.xml
```

### Upload Process

1. Generate XML from call data
2. Create local temporary file
3. Calculate file fingerprint (SHA-256)
4. Check for changes since last upload
5. Attempt SFTP connection
6. Upload file to remote directory
7. Clean up local temporary file
8. Log upload status

### Error Handling

- **Authentication Errors:** Retry with exponential backoff
- **Connection Timeouts:** 5 retry attempts
- **File Already Exists:** Skip upload (fingerprint matching)
- **Network Issues:** Retry with increasing delays

## Google Sheets API Integration

### Authentication

**Method:** Service Account JSON key
**Scopes:** `https://www.googleapis.com/auth/spreadsheets`
**Auto-refresh:** Enabled with 50-minute refresh cycle

### Sheet Structure

#### Logs Sheet (Column A-E)
- A: Timestamp
- B: Level (info, error, warning)
- C: Message
- D: Status
- E: XML (truncated)

#### Call Data Sheet (Column A-X)
- A: Timestamp
- B: Call ID
- C: Nature
- D: Note
- E: Address
- F: City
- G: State
- H: Zip
- I: Units
- J: Priority
- K: Response Mode
- L: En Route Time
- M: On Scene Time
- N: At Patient Time
- O: Cleared Time
- P: Back In Service Time
- Q: Latitude
- R: Longitude
- S: Contact Name
- T: Contact Info
- U: External ID
- V: Last Updated
- W: Unit Count
- X: XML

#### Annual Call Report 2025 (Column A-AC)
Complete call analysis with:
- Full call metadata
- Unit response tracking
- XML generation status
- SFTP upload status and URLs
- Performance metrics

## XML Generation Specifications

### Field Mappings

| Source | Resgrid Field | XML Element | Processing |
|--------|---------------|-------------|------------|
| Call | CallId | IncidentNumber | Direct mapping |
| Call | LoggedOn | IncidentOrOnset, DispatchNotified | ISO timestamp |
| Call | Name | CallNature | HTML tags stripped |
| Call | Nature | CadDispatchText | HTML tags stripped |
| Call | Address | IncidentAddress1, IncidentCity, IncidentState, IncidentZip | Parsed components |
| Dispatches | Unit Names | EmsUnitCallSign or Units/Unit | Single vs multiple format |
| Activity | StatusId=5 | UnitEnRoute | First occurrence timestamp |
| Activity | StatusId=6 | UnitArrivedOnScene | First occurrence timestamp |
| Activity | StatusId=3 | UnitAtPatient | First occurrence timestamp |
| Activity | StatusId=8,2 | UnitCleared, UnitBackInService | Last occurrence timestamp |
| Call | Geolocation | SceneGpsLocationLat, SceneGpsLocationLong | Coordinate parsing |
| Call | ContactName | PatientFirstName, PatientLastName | Name parsing |

### XML Structure Logic

**Single Unit (Flat Structure):**
```xml
<CadIncident>
  <IncidentNumber>198872</IncidentNumber>
  <EmsUnitCallSign>STN1</EmsUnitCallSign>
  <CallNature>Medical Emergency</CallNature>
  <UnitEnRoute>2025-06-03T10:05:00.000Z</UnitEnRoute>
  ...
</CadIncident>
```

**Multiple Units (Nested Structure):**
```xml
<CadIncident>
  <IncidentNumber>198898</IncidentNumber>
  <CallNature>Structure Fire</CallNature>
  <Units>
    <Unit>
      <EmsUnitCallSign>CMD11</EmsUnitCallSign>
      <UnitEnRoute>2025-06-03T10:05:00.000Z</UnitEnRoute>
      ...
    </Unit>
    <Unit>
      <EmsUnitCallSign>STN1</EmsUnitCallSign>
      <UnitEnRoute>2025-06-03T10:06:00.000Z</UnitEnRoute>
      ...
    </Unit>
  </Units>
</CadIncident>
```

### Priority Mapping

| Resgrid Priority ID | Response Mode | Description |
|-------------------|---------------|-------------|
| 1559 | 395 | Cold Response |
| 1560 | 390 | Hot Response |

## Testing and Validation

### System Test Commands

```bash
# Complete system verification
node comprehensive-system-test.js

# Individual component tests
node test-xml-upload-logging.js       # Google Sheets integration
node fetch-and-log-active-calls.js    # Active call monitoring
node confirm-stn1-status.js           # Unit status verification
node annual-report-with-sftp-status.js # Historical data analysis
```

### Test Results Validation

Expected outputs:
- 7/7 system tests passing
- XML generation for both single and multiple unit scenarios
- Google Sheets write operations successful
- SFTP status tracking accurate

### Performance Benchmarks

| Operation | Target Time | Actual Performance |
|-----------|-------------|-------------------|
| Call Detection | < 10 seconds | Real-time via SignalR |
| XML Generation | < 5 seconds | < 1 second typical |
| SFTP Upload | < 10 seconds | 3-5 seconds typical |
| Sheets Logging | < 3 seconds | < 1 second typical |

## Error Codes and Troubleshooting

### Common Error Scenarios

#### Resgrid API Errors
- **401 Unauthorized:** Token expired or invalid credentials
- **404 Not Found:** Call ID doesn't exist or access denied
- **500 Internal Server Error:** Resgrid system issue
- **Rate Limiting:** Too many requests

#### SFTP Errors
- **Authentication Failed:** Invalid SFTP credentials
- **Connection Timeout:** Network or server issues
- **Permission Denied:** Directory access restrictions
- **File Already Exists:** Duplicate upload attempt

#### Google Sheets Errors
- **403 Forbidden:** Service account lacks permissions
- **429 Too Many Requests:** API quota exceeded
- **400 Bad Request:** Invalid data format or range

### Debugging Tools

```bash
# API connectivity testing
curl -X POST https://api.resgrid.com/api/v4/Connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password&username=USER&password=PASS"

# Unit status verification
node check-stn1-status-once.js

# XML generation testing
node test-callnature-removal.js
```

## Version Compatibility

### Current Version: 1.6.0
**Release Date:** June 3, 2025
**Key Features:**
- Multiple unit XML support
- SFTP status tracking
- Annual reporting
- Enhanced error handling

### API Version Compatibility
- **Resgrid API:** v4 (current)
- **Google Sheets API:** v4
- **Node.js:** 18+ recommended

### Backward Compatibility
- Single unit XML format maintained
- Legacy field mappings preserved
- Existing Google Sheets structure supported

---

**Last Updated:** June 3, 2025  
**System Status:** All APIs operational and verified  
**Next Review:** Monthly system health check