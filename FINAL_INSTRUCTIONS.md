# Final Fix for Resgrid API Integration

I've updated the Resgrid to ESO bridge with the latest improvements to ensure consistent data field mapping between XML files and Google Sheets logs.

## Latest Improvements (May 7, 2025)

1. **Fixed Unit Name Deduplication**:
   - Prevented duplicate unit names in XML files and Google Sheets (e.g., "STN1, STN1")
   - Implemented Set-based deduplication for clean unit lists

2. **Added Last Updated Timestamp and Row Updates in Google Sheets**:
   - Added "Last Updated" timestamp column to track when records were last modified
   - Calls now update existing rows instead of creating duplicates
   - Implemented check for existing records based on Call ID

3. **Fixed "No Units" Issue in Google Sheets**:
   - Now correctly displays units attached to calls in Google Sheets
   - Pulls unit data from both Activity and Dispatches arrays in Resgrid API
   - Enhanced unit name extraction to find units with or without status updates

4. **Improved Unit Time Extraction**:
   - Directly uses StatusId values (5=En Route, 6=On Scene, etc.) for more reliable data
   - Replaced text-matching with direct ID lookups to handle "Unknown" StatusText values

5. **Enhanced Status Fallback Logic**:
   - Better handling of calls missing certain status events
   - Implemented proper fallback cascade for Back In Service times
   - Improved handling of Cleared status with multiple fallback options

6. **Field Synchronization**: All fields are now consistent between XML and Google Sheets, including:
   - Unit Location, En Route Time, Arrived Time, At Patient Time, Cleared Time, Back In Service Time
   - Response Mode detection (Emergency vs Non-Emergency)
   - Patient information (First Name, Last Name, Phone, DOB)
   - CAD Number (from RunNumber field)

## Key Fixes

1. **API Integration**: Using correct API endpoints and data structure
   - Call Data Structure: `response.data.Data` 
   - Activity Data: `response.data.Data.Activity`
   - Authentication: `/api/v4/Connect/token` with grant_type=password

2. **Field Mapping**: Proper mapping of all fields between Resgrid and ESO
   - Priority mapping: Resgrid Priority ID to ESO Response Mode codes
   - Patient name splitting from ContactName

3. **XML Schema**: Using the exact `CadIncident` schema required by ESO

## New Deployment Package

I've created an updated deployment package with all fixes:
- `resgrid-eso-bridge-deployment-final-fixed.tar.gz`

## Installation & Usage

1. Download the latest deployment package

2. Extract the contents:
   ```
   tar -xzf resgrid-eso-bridge-deployment-final-fixed.tar.gz -C /path/to/destination
   ```

3. Use the final script to process calls:
   ```
   node final-with-sheets-fix.js --days=7
   ```

4. This script:
   - Uses the verified API endpoints
   - Maps all fields correctly between systems
   - Generates consistent XML and Google Sheets data
   - Implements retry logic for SFTP uploads

## Deploying to Fly.io

If you're deploying to Fly.io:

1. Extract the contents of the package
2. Set up your secrets in Fly.io:
   ```
   fly secrets set RESGRID_USER=your_username RESGRID_PASS=your_password SFTP_HOST=sftp.esosuite.net SFTP_USER=CAD_12345 SFTP_PASS=your_sftp_password
   ```
3. Deploy:
   ```
   fly deploy
   ```

## Integration with Other Scripts

The fixed script is designed to work with the rest of your application. It uses the same logger and Google Sheets integration, but with the correct API endpoint handling for your Resgrid environment.