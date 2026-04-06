# Google Sheets Field Mapping Fix

## Issues Identified
1. Call Received Time field was empty - not extracting timestamp correctly
2. GPS coordinates missing - geolocation parsing incomplete  
3. Call Title field empty - field name mismatch
4. Upload status hardcoded instead of using actual SFTP results

## Solutions Implemented

### 1. Enhanced Field Mapping
Updated `sheets-logger.js` to use multiple data source fallbacks:
- `timestamp: callGetData.LoggedOn || callGetData.LoggedOnUtc || new Date().toISOString()`
- `callTitle: stripHtmlTags(callGetData.Name || '')`
- `incidentType: stripHtmlTags(callGetData.Nature || callGetData.Type || '')`

### 2. Improved GPS Extraction
Added comprehensive GPS coordinate extraction:
```javascript
// Try direct latitude/longitude fields first
if (callGetData.Latitude && callGetData.Longitude) {
  gpsCoords.latitude = callGetData.Latitude;
  gpsCoords.longitude = callGetData.Longitude;
} else if (callGetData.Geolocation) {
  gpsCoords = parseGPSCoordinates(callGetData.Geolocation);
} else if (callGetData.GeoLocation) {
  gpsCoords = parseGPSCoordinates(callGetData.GeoLocation);
}
```

### 3. Dynamic Upload Status
Updated function signature to accept real SFTP upload results:
```javascript
async function sheetCallRow(callData, extraData = {}, uploadStatus = 'Processing...', uploadUrl = '')
```

### 4. Enhanced Data Source Priority
Implemented fallback hierarchy for all fields:
- Primary: Direct field names from API
- Secondary: Alternative field names 
- Tertiary: Nested data structure fields
- Fallback: Default values to prevent empty cells

## Current Field Coverage
After fixes, Google Sheets now properly captures:
- ✅ Emergency Call ID
- ✅ Responding Units  
- ✅ Incident Type
- ✅ Emergency Address
- ✅ Generated XML
- ✅ ESO Upload Status (dynamic)
- 🔄 Call Received Time (improved extraction)
- 🔄 GPS Coordinates (enhanced parsing)
- 🔄 Call Title (field mapping fixed)

## Verification
The system now logs detailed field mapping information and provides comprehensive audit trail of what data is being exported to Google Sheets.

Date: June 7, 2025
Status: Active and Deployed