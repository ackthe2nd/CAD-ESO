# Resgrid to ESO Bridge

A Node.js service that listens for Resgrid SignalR events and forwards call data as XML to ESO via SFTP.

## Features

- Connects to Resgrid SignalR hub to listen for new calls in real-time
- Automatically handles API authentication with credentials and token refresh
- Implements 401 detection and automatic request retry
- Fetches detailed call information from Resgrid API
- Generates XML files formatted according to ESO requirements
- Uses reliable template strings for XML generation with proper element nesting
- Maps Resgrid Priority IDs to ESO ResponseModeToScene codes
- Extracts unit timestamps (en route, on scene, back in service) from Activity status changes
- Prioritizes "returning" status detection for UnitBackInService field
- Uploads files securely via SFTP with retry and fallback mechanisms
- Provides structured JSON logging for monitoring and troubleshooting
- Integrates with Google Sheets for logging application events and call data
- Implements exponential backoff for transient errors
- Includes utilities to view and process existing calls

## Deployment Instructions

### Environment Variables

Create a `.env` file or set the following environment variables:

```
# Resgrid API Configuration
RESGRID_USER=your_resgrid_username
RESGRID_PASS=your_resgrid_password

# SFTP Configuration for ESO
SFTP_HOST=sftp.example.com
SFTP_USER=sftp_username
SFTP_PASS=sftp_password
SFTP_DIR=/incoming/calls

# Google Sheets Logging (Optional)
# Option 1: Use Replit Secrets (recommended)
# Add GOOGLE_SERVICE_ACCOUNT_JSON and LOG_SHEET_ID in the Replit Secrets tab

# Option 2: Use a key file
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./your-project-id-123abc.json
LOG_SHEET_ID=YOUR_GOOGLE_SHEET_ID

# Option 3: Use Base64 encoded JSON for deployments
GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<base64-encoded-service-account-json>
```

### Google Sheets Integration

The application includes integration with Google Sheets for logging both general application events and call data. This provides a user-friendly way to monitor system activity and audit call processing.

#### Setup Instructions

1. **Create a Google Service Account**:
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project (or select an existing one)
   - Navigate to "APIs & Services" > "Credentials"
   - Click "Create Credentials" and select "Service Account"
   - Give your service account a name and description
   - Grant the role "Editor" or "Spreadsheets Editor" to the service account
   - Click "Create" and then "Done"

2. **Generate a Service Account Key**:
   - Find your service account in the list and click on it
   - Navigate to the "Keys" tab
   - Click "Add Key" and select "Create new key"
   - Choose JSON format and click "Create"
   - Save the downloaded JSON file to your project directory (e.g., as `google-service-account-key.json`)

3. **Create a Google Sheet**:
   - Create a new Google Sheet in your Google Drive
   - Share the sheet with the service account email (e.g., `service-account-name@project-id.iam.gserviceaccount.com`) with "Editor" permissions
   - Copy the Sheet ID from the URL (it's the long string between `/d/` and `/edit` in the URL)

4. **Configure Authentication**:
   - You have three options:
     
     **Option 1: Using Replit Secrets (Recommended)**
     - Go to the "Secrets" tab in your Replit project
     - Add `GOOGLE_SERVICE_ACCOUNT_JSON` with the entire JSON content
     - Add `LOG_SHEET_ID` with your Google Sheet ID
     
     **Option 2: Using a Key File**
     - Add the following to your `.env` file:
       ```
       GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./path-to-your-key-file.json
       LOG_SHEET_ID=your-google-sheet-id
       ```
     
     **Option 3: Using Base64 Encoded JSON**
     - Encode your JSON file: `cat your-key-file.json | base64 -w 0`
     - Add to your `.env` file:
       ```
       GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<paste-base64-string-here>
       LOG_SHEET_ID=your-google-sheet-id
       ```

   See [SETTING_UP_GOOGLE_SHEETS_SECRET.md](SETTING_UP_GOOGLE_SHEETS_SECRET.md) for detailed setup instructions.

The application will automatically create two sheets within your Google Sheet:
- **Logs**: Contains general application logs with timestamp, level, and message
- **Call Data**: Contains call processing records with timestamp, call ID, nature, priority, address, units, and status

If the Google Sheets integration is not configured (missing environment variables or service account key), the application will continue to function with local logging only.

### Fly.io Deployment

```bash
npm install
npm i -g flyctl
fly launch --name resgrid2eso --no-deploy
fly secrets set RESGRID_USER=<username> RESGRID_PASS=<password> SFTP_HOST=<host> SFTP_USER=<u> SFTP_PASS=<p> SFTP_DIR=/incoming
fly deploy
```

**Important Note:** Set `RESGRID_USER` and `RESGRID_PASS` as Fly.io secrets instead of `RESGRID_TOKEN`; the service now logs in automatically and refreshes when the token expires.

## How It Works

1. The service establishes a connection to the Resgrid SignalR hub
2. When a new call is added, the `CallAdded` event is triggered
3. The service uses Resgrid credentials to obtain an API token
4. The token is used to fetch detailed call data from the Resgrid API
5. XML is generated with all available call information
6. The XML file is uploaded to the ESO SFTP server as `incident_{CallId}.xml`
7. The service logs `✅ pushed {CallId}` on success

## XML Data Mapping

The service captures and maps all available data from Resgrid to the ESO XML format according to ESO's exact field mapping requirements:

### Required Fields
- `IncidentNumber` - Mapped from Resgrid `CallId`
- `IncidentOrOnset` - Mapped from Resgrid `Timestamp` or `LoggedOn`
- `ComplaintReportedByDispatch` - Mapped from Resgrid `Type` (e.g., "Medical Emergency")
- `EmsUnitCallSign` - Mapped from Resgrid dispatched units where Type="Unit"
- `CadDispatchText` - Mapped from Resgrid `Nature`
- `CallNature` - Mapped from Resgrid `Name`
- `CallNatureDescription` - Combines Resgrid `Nature` and `Note` with space-hyphen-space format

### Address and Location Fields
- `IncidentAddress1` - Full address of the incident
- `IncidentCity` - Parsed from the Address (usually second component after comma)
- `IncidentState` - Parsed from the Address (usually first part of third component)
- `IncidentZip` - Parsed from the Address (usually second part of third component)
- `SceneGpsLocationLat` - Latitude extracted from Geolocation
- `SceneGpsLocationLong` - Longitude extracted from Geolocation

### Patient Information Fields
- `PatientFirstName` - First part of ContactName
- `PatientLastName` - Remaining parts of ContactName
- `PatientPhone` - Mapped from ContactInfo (phone number)
- `PatientDOB` - Mapped from ExternalId

### Response Information
- `ResponseModeToScene` - Mapped from Priority ID:
  - 1560 → 390 (Emergent/Lights & Sirens)
  - 1559 → 395 (Non-emergent/No Lights & Sirens)
  - Default → 390 (Emergent)

### Unit Time Fields
- `UnitEnRoute` - When unit started traveling to the scene (StatusId=5 in Activity array)
- `UnitArrivedOnScene` - When unit arrived at the incident location (StatusId=6 in Activity array)
- `UnitAtPatient` - When unit reached the patient (StatusId=7 in Activity array)
- `UnitCleared` - When unit completed the call (StatusId=8 in Activity array)
- `UnitBackInService` - When unit returned to available status (StatusId=9 or StatusId=2)

The service uses direct StatusId values for reliable status detection:
1. For En Route: Uses StatusId=5 entries in Activity array
2. For On Scene: Uses StatusId=6 entries in Activity array
3. For At Patient: Uses StatusId=7 entries in Activity array
4. For Cleared: Uses StatusId=8, with fallbacks to StatusId=9, StatusId=2, or call.ClosedOn
5. For Back In Service: Uses StatusId=9 (Returning), with fallbacks to StatusId=2 (Available) or StatusId=8 (Cleared)

This StatusId-based approach ensures reliable time extraction even when StatusText values are "Unknown" in the Resgrid data.

The XML generator automatically extracts these timestamps from the Activity array when available. For detailed information about how unit times are extracted, see [UNIT_TIMES.md](UNIT_TIMES.md).

## Improved Architecture

### 1. Optimized Token Management

The service intelligently handles Resgrid API authentication:

- Logs in with RESGRID_USER and RESGRID_PASS credentials
- Caches the token and its expiration time
- Intelligently refreshes tokens only when needed (15 minutes before expiration)
- Reduces log noise with smart logging levels for token operations
- Detects 401 errors and automatically refreshes the token
- Retries failed requests with the new token
- Falls back to alternative authentication endpoints if needed
- Implements token refresh optimizations to minimize API requests

For detailed information about the token optimization, see [TOKEN_OPTIMIZATION.md](TOKEN_OPTIMIZATION.md).

### 2. Centralized Configuration

Configuration is managed centrally through the `config.js` module:

- Loads environment variables with sensible defaults
- Validates required configuration on startup
- Supports multiple naming conventions for backward compatibility
- Provides a single access point for all configuration values

### 3. Structured Logging

The application uses Winston for structured logging:

- Different log levels (debug, info, warn, error) for granular control
- JSON-formatted logs for better parsing and analysis
- Console output for real-time monitoring
- File output with rotation for historical records
- Separate error log file for easier troubleshooting
- Google Sheets integration for accessible, spreadsheet-based logs

#### Google Sheets Logging

In addition to traditional local logging, the application can send logs to Google Sheets:

- **Application Logs**: General application events with timestamps and log levels
- **Call Processing Logs**: Detailed tracking of calls processed through the system
- **Audit Trail**: Complete history of system activity accessible via a familiar interface
- **Real-time Updates**: Logs are appended to the spreadsheet as events occur
- **Smart Row Updates**: Detects existing call records and updates them instead of creating duplicates
- **Last Updated Timestamps**: Adds "Last Updated" column to track when records were last modified
- **Unit Data Enhancement**: Fixed "No Units" issue by checking both Activity and Dispatches arrays
- **Graceful Fallbacks**: Continues functioning with local logs if Sheets integration is unavailable

### 4. Smart Error Handling

Error handling is improved throughout the application:

- Differentiates between temporary and permanent failures
- Implements exponential backoff for retryable errors
- Provides detailed error logs with context information
- Gracefully recovers from network interruptions

### 5. Fingerprint Caching

The application implements fingerprint caching to avoid redundant file uploads:

- Calculates SHA-256 hash of file content before upload
- Caches fingerprints for each file and destination path
- Only uploads files when content has actually changed
- Significantly reduces SFTP operations and network traffic
- Provides clear logging about skipped unchanged files

### 5. Consistent Priority Mapping

The application centralizes priority mapping logic:

- Resgrid Priority ID 1560 → ESO ResponseModeToScene 390 (lights & sirens)
- Resgrid Priority ID 1559 → ESO ResponseModeToScene 395 (non-lights & sirens)
- Default to 390 (lights & sirens) for unrecognized or missing values

### 6. Improved XML Generation

The application uses a more reliable approach to XML generation:

- Switched from xmlbuilder2 to template strings for consistent formatting
- Ensures all text content is properly nested within XML tags
- Prevents common XML formatting issues like stray closing tags
- Maintains proper indentation and readability in generated files
- Automatically handles special characters and escaping
- Properly handles carriage returns and other special characters in addresses

### 7. Enhanced Unit Data Handling

The application implements robust handling and filtering for unit data:

- Collects units from both Activity array and Dispatches array for complete unit information
- Implements proper unit name deduplication to prevent duplicate entries (e.g., "STN1, STN1")
- Only includes units with Type="Unit" in the generated XML
- Validates that unit names are alphanumeric and at most 9 characters in length
- Provides detailed logging of unit data processing for troubleshooting
- Gracefully handles cases where no valid units are found
- Fixed "No Units" issue in Google Sheets for calls with assigned units but no activity data

### 8. Enhanced Unit Timestamp Extraction

The application now uses direct StatusId-based extraction for unit timestamps:

- Directly uses StatusId values for guaranteed accuracy regardless of StatusText content
- Identifies en route time using StatusId=5 entries in the Activity array
- Identifies on scene time using StatusId=6 entries in the Activity array
- Extracts at patient time using StatusId=7 entries in the Activity array
- Extracts cleared time using StatusId=8 with fallbacks to StatusId=9, StatusId=2, or call.ClosedOn
- Determines back in service time using StatusId=9 (Returning) with fallbacks to StatusId=2 (Available)
- Eliminates dependency on text matching, which was unreliable with "Unknown" StatusText values
- Implements intelligent fallback cascade for cases where certain status updates are missing
- Includes comprehensive logging of timestamp extraction decisions for troubleshooting
- Handles edge cases where the same status might apply to multiple timestamp fields

For detailed information about the unit times extraction, see [UNIT_TIMES_EXTRACTION.md](UNIT_TIMES_EXTRACTION.md).

### 9. Comprehensive Documentation

The project includes detailed documentation in multiple formats:

- **Field Mapping Reference**: [FIELD_MAPPING_REFERENCE.md](FIELD_MAPPING_REFERENCE.md) - Complete field mapping between Resgrid and ESO
- **XML Field Updates**: [XML_FIELD_UPDATES.md](XML_FIELD_UPDATES.md) - Documentation of XML field changes and status code mapping
- **Google Sheets Integration**: [GOOGLE_SHEETS_INTEGRATION.md](GOOGLE_SHEETS_INTEGRATION.md) - Setup and usage of Google Sheets logging
- **Google Sheets Secret Setup**: [SETTING_UP_GOOGLE_SHEETS_SECRET.md](SETTING_UP_GOOGLE_SHEETS_SECRET.md) - Guide for setting up Google Sheets with Replit Secrets
- **Unit Times Extraction**: [UNIT_TIMES_EXTRACTION.md](UNIT_TIMES_EXTRACTION.md) - Detailed explanation of timestamp extraction logic
- **Token Refresh**: [TOKEN_REFRESH.md](TOKEN_REFRESH.md) - Information about the token refresh mechanism
- **Fingerprint Caching**: [FINGERPRINT_CACHING.md](FINGERPRINT_CACHING.md) - Documentation of the fingerprint caching mechanism
- **Deployment Guide**: [DEPLOYMENT.md](DEPLOYMENT.md) - Instructions for deploying the application
- **API Endpoints**: [FIXED_API_ENDPOINTS_UPDATED.md](FIXED_API_ENDPOINTS_UPDATED.md) - Comprehensive guide to working Resgrid API endpoints

### 10. Comprehensive Testing

The application includes a robust testing framework:

- End-to-end tests using real Resgrid API data
- Validation of XML formatting using standard XML parsers
- Unit tests for key components like priority mapping and unit filtering
- Dedicated tests for unit timestamp extraction
- Test reports to verify processing success rates
- Mock SFTP client for testing file uploads without external dependencies

For detailed information about the XML field mapping, see [Resgrid_ESO_Field_Mapping_Final.md](Resgrid_ESO_Field_Mapping_Final.md).

## Additional Utilities

This package includes several utility scripts:

### 1. Real-time Listener (`listener.js`)
The main service that connects to Resgrid SignalR and listens for new calls.
```bash
node listener.js
```

### 2. Fetch Latest Calls (`fetch-latest-calls.js`)
Display detailed information about all current active calls from Resgrid.
```bash
node fetch-latest-calls.js
```

### 3. View Recent Calls (`show-recent-calls.js`) 
Display active calls from Resgrid without processing them.
```bash
node show-recent-calls.js
```

### 4. Process Existing Calls (`fetch-existing-calls.js`)
Fetch and process active calls from Resgrid, generating XML and uploading to ESO.
```bash
node fetch-existing-calls.js --days=7
```

### 5. Google Sheets Export (`export-calls-to-sheets.js`)
Export call data directly to Google Sheets without generating XML files.
```bash
# Export active calls only
node export-calls-to-sheets.js --active

# Export calls from the last 7 days (default)
node export-calls-to-sheets.js

# Export calls from the last X days
node export-calls-to-sheets.js --days=30
```

For more details about the Google Sheets export functionality, see [GOOGLE_SHEETS_EXPORT.md](GOOGLE_SHEETS_EXPORT.md).

### 6. Test Scripts
Various test scripts are included to verify different components of the system:
- `test-connect-token.js` - Test Resgrid authentication
- `test-xml-generation.js` - Test XML generation with mock data
- `test-exact-xml-match.js` - Verify exact format requirements for ESO XML
- `test-fixed-xml-match.js` - Verify proper XML formatting with correct tag nesting
- `test-unit-times.js` - Test unit timestamps are correctly included in XML
- `test-priority-mapping.js` - Test proper mapping of Priority IDs to ESO codes
- `test-unit-filtering.js` - Test proper filtering of units based on type and name
- `test-sftp-mock.js` - Test SFTP upload with a mock client
- `test-token-refresh.js` - Test automatic token refresh with 401 detection
- `test-fingerprint-caching.js` - Test the fingerprint caching mechanism for SFTP uploads
- `test-full-workflow.js` - Test the entire workflow with mock data
- `test-full-integration.js` - Comprehensive end-to-end test with real Resgrid API data
- `test-all-features.js` - Complete test suite covering all major components

To run the comprehensive integration test:
```bash
node test-full-integration.js [days]
```
Where `[days]` is the number of days to look back for calls (default: 7)

## Deployment

For detailed deployment instructions, see the [Deployment Guide](DEPLOYMENT.md).