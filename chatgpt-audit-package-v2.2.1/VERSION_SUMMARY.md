# Version Summary v2.1.2

This document provides a summary of the updates and changes in version 2.1.2 of the Resgrid-ESO Bridge.

## Key Changes

1. **Location Column Integration** - Implemented comprehensive location data extraction from "LOCATION:" fields in incident details:
   - Automatic extraction using regex pattern `/LOCATION:\s*([^\n\r]+)/i`
   - Location data appears in Google Sheets column MM (39th column)
   - Enhanced emergency response coordination with precise location information
   - Production validated with real emergency call data

2. **Complete System Coverage** - Location extraction integrated across entire system:
   - Updated all 11 deployment packages with consistent Location column support
   - Enhanced 6 test scripts to include Location data extraction
   - Dynamic column mapping adapts to existing Google Sheets structure
   - Maintains backward compatibility with existing call processing workflows

3. **Pacific Time Standardization** - All timestamp fields use consistent Pacific Time format:
   - Format: `2025-06-08 HH:MM:SS` across all Google Sheets fields
   - Enhanced test button functionality with "[TEST BUTTON]" prefix identification
   - Complete XML preservation while improving timestamp readability
   - Comprehensive field coverage in both Call Data and Logs tabs

4. **Enhanced SFTP Connection Resilience** - Multi-strategy approach for reliable uploads:
   - 4-strategy progressive connection methods (Quick Connect → Aggressive TCP → Legacy → Raw Socket)
   - Fly.io platform optimizations resolving "Connection lost before handshake" errors
   - Intelligent retry logic with categorized error handling
   - Fresh connections per upload attempt for maximum reliability

## Enhanced Features

1. **Location Data Extraction** - Advanced parsing of location information from incident details:
   - Pattern matching for "LOCATION:" keyword in incident descriptions
   - Automatic cleanup of extracted location text (removes trailing punctuation)
   - Length validation ensures meaningful location data (minimum 3 characters)
   - Error handling for malformed or missing location data

2. **Google Sheets Integration** - Comprehensive 39-column data mapping:
   - Dynamic header adaptation preserves existing sheet structures
   - Location column positioned at column MM for optimal workflow integration
   - Pacific Time formatting standardized across all timestamp fields
   - Test operation identification with clear audit trail markers

3. **Production Reliability** - Enhanced system stability and monitoring:
   - Multi-strategy SFTP connection approach resolves platform-specific issues
   - XML integrity monitoring with comprehensive verification
   - Complete call lifecycle tracking from creation through closure
   - Real-time health monitoring with performance metrics

## Technical Details

### Location Extraction Implementation

```javascript
function extractLocationFromIncidentDetails(incidentDetails) {
  const locationMatch = incidentDetails.match(/LOCATION:\s*([^\n\r]+)/i);
  if (locationMatch && locationMatch[1]) {
    let location = locationMatch[1].trim();
    location = location.replace(/[.,;]+$/, '').trim();
    return location.length >= 3 ? location : '';
  }
  return '';
}
```

### Google Sheets Column Structure (39 columns total)

Location data integration examples:
```
Input: "Patient reports chest pain. LOCATION: Emergency Medical Tent, Section A-12. Patient conscious."
Output (Column MM): "Emergency Medical Tent, Section A-12. Patient conscious"
```
<CrossStreets/>
```

### Unit Status Monitoring

The new unit status monitoring tools use the verified unit ID (8826) to reliably track STN1's status across multiple endpoints:

1. **Direct Unit Status**: `UnitStatus/GetUnitStatus?unitId=8826`
2. **All Units List**: `Units/GetAllUnitsInfos` and finding STN1 in the results
3. **All Unit Statuses**: `UnitStatus/GetAllUnitStatuses` and finding STN1
4. **Active Calls**: Scanning active calls for STN1 in Activity and Dispatches arrays

## Deployment Instructions

1. Download the deployment package: `resgrid-eso-bridge-deployment-v1.4.2.tar.gz`
2. Extract the package to your server
3. Copy your environment configuration:
   ```
   cp .env.production .env
   ```
4. Install dependencies:
   ```
   npm install
   ```
5. Start the service:
   ```
   node listener.js
   ```

For detailed deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Testing

1. To check STN1's current status:
   ```
   node confirm-stn1-status.js
   ```

2. To monitor STN1's status in real-time:
   ```
   node monitor-stn1-status-fixed.js monitor
   ```

3. To process existing calls with the updated XML format:
   ```
   node fetch-existing-calls.js --days=7
   ```