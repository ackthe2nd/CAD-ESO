# Google Sheets Integration for Resgrid-ESO Bridge

This document provides complete information about the Google Sheets integration feature in the Resgrid-ESO Bridge application.

## Overview

The Google Sheets integration allows the Resgrid-ESO Bridge to log both application events and call processing data to Google Sheets. This provides a user-friendly way to monitor system activity and maintain an audit trail of processed calls without requiring direct access to the server logs.

## Features

- **Dual Logging Sheets**:
  - **Logs Sheet**: General application events with timestamps and log levels
  - **Call Data Sheet**: Detailed tracking of all calls processed through the system

- **Automatic Setup**:
  - Sheets are automatically created if they don't exist
  - Headers are automatically added to new sheets
  - No manual sheet configuration required

- **Graceful Degradation**:
  - System continues functioning with local logs if Sheets integration is unavailable
  - Non-blocking design prevents Google Sheets issues from affecting core functionality

- **Audit Trail**:
  - Complete history of system activity accessible via a familiar interface
  - Real-time updates as events occur
  - Historical record of all processed calls

## Setup Instructions

### 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the Google Sheets API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click on it and then click "Enable"

### 2. Create a Google Service Account

1. Navigate to "APIs & Services" > "Credentials"
2. Click "Create Credentials" and select "Service Account"
3. Give your service account a name and description
4. Grant the role "Editor" or "Spreadsheets Editor" to the service account
5. Click "Create" and then "Done"

### 3. Generate a Service Account Key

1. Find your service account in the list and click on it
2. Navigate to the "Keys" tab
3. Click "Add Key" and select "Create new key"
4. Choose JSON format and click "Create"
5. Save the downloaded JSON file to your project directory (e.g., as `google-service-account-key.json`)

### 4. Create a Google Sheet

1. Create a new Google Sheet in your Google Drive
2. Share the sheet with the service account email address
   - The email will look like: `service-account-name@project-id.iam.gserviceaccount.com`
   - Give it "Editor" permissions
3. Copy the Sheet ID from the URL
   - It's the long string between `/d/` and `/edit` in the URL
   - Example: `https://docs.google.com/spreadsheets/d/`**`1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789`**`/edit`

### 5. Configure Credentials

You have three options for configuring the Google service account credentials:

#### Option 1: Using Replit Secrets (Recommended)

This is the most secure method and works well for deployments:

1. Go to the Replit "Secrets" tab (lock icon) in your project
2. Add a new secret with key `GOOGLE_SERVICE_ACCOUNT_JSON`
3. Paste the entire contents of your JSON key file as the value
4. Add another secret with key `LOG_SHEET_ID` and your Google Sheet ID as the value

This keeps your credentials secure and avoids storing them in files or environment variables.

#### Option 2: Using a Key File (for local development)

Add the following to your `.env` file:

```
# Google Sheets Logging
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./path-to-your-key-file.json
LOG_SHEET_ID=your-google-sheet-id
```

#### Option 3: Using Base64 Encoded JSON (alternative for deployment)

For systems that don't support Replit Secrets:

1. Convert your service account JSON key file to Base64:
   ```
   cat your-key-file.json | base64 -w 0
   ```
   
2. Add the following to your `.env` file:
   ```
   # Google Sheets Logging
   GOOGLE_SERVICE_ACCOUNT_JSON_BASE64=<paste-your-base64-encoded-json-here>
   LOG_SHEET_ID=your-google-sheet-id
   ```

The application will check for these methods in order: Replit Secrets, then Base64 encoding, then the key file path.

## Sheet Structures

### Logs Sheet
Headers:
```
Timestamp, Level, Message
```

Example row:
```
2025-05-06T11:51:40.984Z, info, Processed call 198513
```

### Enhanced Calls Sheet (New Format)
Headers:
```
Timestamp, Call ID, Call Type, XML, Nature, Note, Address, City, State, Zip, Latitude, Longitude, Priority, Response Mode, Units, En Route Time, Arrived Time, At Patient Time, Cleared Time, Patient First Name, Patient Last Name, Patient Phone, Patient DOB
```

This new enhanced format places the complete XML data in column D, allowing for easy verification of the XML structure and content that would be sent to ESO. This provides a complete audit trail of not just the raw data, but also the formatted XML output.

Example row:
```
2025-05-06T11:51:40.984Z, 198513, Medical, <CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance"><Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>...</CadIncident>, PERSON DOWN, Patient complaining of chest pain, 11401 Chalon Rd, Los Angeles, CA, 90049, 34.0932, -118.4928, Emergent, Lights & Sirens, AMB2, 2025-05-06T11:32:15Z, 2025-05-06T11:38:22Z, 2025-05-06T11:39:05Z, 2025-05-06T11:50:30Z, John, Doe, 555-123-4567, 123456
```

### Legacy Call Data Sheet
Headers:
```
Timestamp, Call ID, Call Type, Nature, Note, Address, City, State, Zip, Priority, Response Mode, Unit Name, Unit Location, En Route Time, Arrived Time, At Patient Time, Cleared Time, Back In Service Time, Latitude, Longitude, Patient First Name, Patient Last Name, Contact Info, External ID
```

Example row:
```
2025-05-06T11:51:40.984Z, 198513, Medical, PERSON DOWN, Patient complaining of chest pain, 11401 Chalon Rd, Los Angeles, CA, 90049, Emergent, Lights & Sirens, AMB2, Station 1, 2025-05-06T11:32:15Z, 2025-05-06T11:38:22Z, 2025-05-06T11:39:05Z, 2025-05-06T11:50:30Z, 2025-05-06T11:55:12Z, 34.0932, -118.4928, John, Doe, 555-123-4567, 123456
```

## Implementation Details

### Components

1. **sheets-logger.js**: Core module handling all Google Sheets operations
   - Initializes connection to Google Sheets API
   - Creates sheets if they don't exist
   - Provides `sheetLog()` and `sheetCallRow()` functions

2. **logger.js**: Enhanced Winston logger with Google Sheets integration
   - Continues logging to console and files
   - Adds Google Sheets as an additional log destination
   - Non-blocking design to prevent slowdowns

3. **export-calls-to-sheets-enhanced.js**: Dedicated tool for exporting calls to Google Sheets
   - Includes full XML export in column D
   - Automatically creates and formats 'Calls' sheet if it doesn't exist
   - Handles both active calls and historical call data
   - Command-line options for controlling export scope:
     - `--active`: Export only active calls
     - `--days=N`: Export calls from the last N days

4. **index.js & fetch-existing-calls.js**: Updated to log call data
   - Call data is logged after successful processing
   - Logs include all relevant call details with proper field mapping

### Error Handling

The integration includes comprehensive error handling:

- Invalid or missing credentials are handled gracefully
- Network issues with Google Sheets API don't affect core functionality
- Initialization failures are logged with detailed error messages
- All Google Sheets operations are wrapped in try/catch blocks

### Testing

You can verify the Google Sheets integration is working by:

1. Setting up the required environment variables
2. Running any processing script (e.g., `node fetch-existing-calls.js`)
3. Checking your Google Sheet for new entries

### Using the Enhanced Export Tool

The enhanced export tool provides a convenient way to export call data to Google Sheets with the complete XML data included for verification.

#### Basic Usage

```bash
# Export only active calls
node export-calls-to-sheets-enhanced.js --active

# Export calls from the last 7 days (default)
node export-calls-to-sheets-enhanced.js

# Export calls from the last N days
node export-calls-to-sheets-enhanced.js --days=14
```

#### Features

- **Automatic Sheet Creation**: Creates the 'Calls' sheet if it doesn't exist
- **Formatted Headers**: Adds and formats column headers automatically
- **XML in Column D**: Includes the complete XML that would be sent to ESO
- **Enhanced Data Extraction**: Parses address, geolocation, and contact information
- **Comprehensive Status Mapping**: Maps all status codes to timestamps
- **Command-line Options**: Control which calls to export

#### Benefits

- **XML Verification**: Easily verify the XML structure and content without accessing the file system
- **Complete Audit Trail**: Full history of all calls and their XML representation
- **No Manual Configuration**: Sheet is automatically created and formatted
- **User-friendly Interface**: Data is accessible through familiar Google Sheets interface
- **Historical Record**: Maintains a record of all calls processed through the system

## Troubleshooting

Common issues and solutions:

1. **"Google Sheets logging is disabled - missing environment variables"**:
   - Ensure you've set up one of the three authentication methods (Replit Secrets, key file, or base64)
   - Make sure the `LOG_SHEET_ID` is set correctly
   - For Replit Secrets, check that `GOOGLE_SERVICE_ACCOUNT_JSON` contains the entire JSON

2. **"Failed to parse service account JSON"**:
   - Verify the JSON is valid and complete (it should contain client_email and private_key)
   - When using Replit Secrets, make sure you're pasting the raw JSON, not a stringified version
   - Check for any accidentally added or removed characters in the JSON

3. **"Google service account key file not found"**:
   - Verify the path to your service account key file is correct
   - Ensure the file exists and is readable
   - Consider using Replit Secrets instead for more reliable deployment

4. **"Failed to parse base64 encoded service account JSON"**:
   - Ensure your base64 string is properly encoded without line breaks
   - Use a command like `cat your-key-file.json | base64 -w 0` on Linux to avoid line breaks
   - Check that the original JSON file is valid before encoding

5. **"Failed to initialize Google Sheets logger"**:
   - Check that your service account has proper permissions
   - Verify the Google Sheets API is enabled in your Google Cloud project
   - Ensure the service account has been granted access to the sheet

6. **No data appearing in sheets**:
   - Verify the sheet ID is correct
   - Check that the service account has editor permissions on the sheet
   - Look for detailed error messages in the console output

7. **"invalid_grant" or "account not found" errors**:
   - Verify that the service account still exists and is active in Google Cloud
   - Check that the private key hasn't been rotated or revoked
   - Create a new service account key if needed