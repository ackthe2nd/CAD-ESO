# XML Field Updates

## EMD_Performed Tag Removal

As of May 7, 2025, the `<EMD_Performed>` tag has been removed from all XML outputs in the Resgrid-ESO Bridge. This change was implemented across the following files:

- `src/index.js`
- `fetch-existing-calls.js`
- `test-show-xml-example.js`
- `deployment-package/src/index.js`
- `deployment-package/fetch-existing-calls.js`
- `src/xml-generator.js`

The `EMD_Performed` field was previously being populated with the Resgrid priority value, but is no longer required in the ESO integration.

### Before (Example):
```xml
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>
  <IncidentNumber>198513</IncidentNumber>
  <!-- ... other fields ... -->
  <ResponseModeToScene>390</ResponseModeToScene>
  <EMD_Performed>1560</EMD_Performed>
  <CrossStreets/>
  <!-- ... remaining fields ... -->
</CadIncident>
```

### After (Example):
```xml
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>
  <IncidentNumber>198513</IncidentNumber>
  <!-- ... other fields ... -->
  <ResponseModeToScene>390</ResponseModeToScene>
  <CrossStreets/>
  <!-- ... remaining fields ... -->
</CadIncident>
```

## Unit Status Code Mapping

The complete unit status code mapping has been verified and documented:

| StatusId | Text | Description | Usage in Integration |
|----------|------|-------------|--------|
| 0 | Available | Unit is available for dispatch | Back in Service (fallback) |
| 2 | Available | Alternative for available status | Back in Service (fallback) |
| 3 | Committed | Unit is at patient | At Patient time |
| 4 | Out of Service | Unit is unavailable | Not used directly |
| 5 | Responding / En Route | Unit is en route to the call | En Route time |
| 6 | On Scene | Unit has arrived at the scene | Arrived on Scene time |
| 7 | Staging | Unit is staged near the scene | Not used directly |
| 8 | Returning | Unit is returning to station | Back in Service time |

The status mapping was verified through multiple methods:

1. Examining status changes in active calls
2. Testing with direct unit status endpoints
3. Monitoring unit status changes in real-time
4. Cross-referencing with status definitions from the API

## Unit ID Verification

The correct Unit ID for STN1 has been verified as **8826**. Previously, some scripts were using incorrect unit IDs. All monitoring and status scripts have been updated to use the correct unit ID.

This unit ID can be used with the following endpoints:
- `UnitStatus/GetUnitStatus?unitId=8826` (direct status lookup)
- Activity and dispatch filtering in call data

## New Monitoring Tools

### 1. Real-time Status Monitor (`monitor-stn1-status-fixed.js`)

A new script called `monitor-stn1-status-fixed.js` has been created to monitor the status of STN1 in real-time using the correct unit ID. This script:

- Checks multiple sources for unit status data
- Displays color-coded status information
- Only shows status updates when changes occur
- Includes comprehensive error handling
- Automatically refreshes the API token as needed

Usage:
```bash
# Run once
node monitor-stn1-status-fixed.js

# Monitor continuously
node monitor-stn1-status-fixed.js monitor
```

### 2. Comprehensive Status Check (`confirm-stn1-status.js`)

The `confirm-stn1-status.js` script provides a complete verification of STN1's status across all available API endpoints:

- Checks GetAllUnitsInfos for unit information
- Checks direct unit status endpoint
- Checks GetAllUnitStatuses endpoint
- Examines all active calls for STN1 activity
- Retrieves status definitions
- Provides a summary of current status from all sources

Usage:
```bash
node confirm-stn1-status.js
```

### 3. Unit Status Test (`status-test.js`)

A simplified script that checks active calls for STN1 status information:

- Scans all active calls
- Finds STN1 in activity arrays
- Identifies StatusId values for mapping validation

Usage:
```bash
node status-test.js
```

## Implementation Notes

1. The Response Mode to Scene values continue to be mapped correctly:
   - 390 = Lights & Sirens (Emergency)
   - 395 = No Lights & Sirens (Non-Emergency)

2. Unit timestamps continue to be extracted from various sources, including:
   - The direct unit timestamps in call data
   - Status changes in the Activity array with appropriate StatusId values
   - Dispatches array entries for the unit

3. When tracking unit status, the following endpoints provide reliable status information:
   - `UnitStatus/GetUnitStatus?unitId=8826` - Direct status lookup
   - `Units/GetAllUnitsInfos` - Complete information including status
   - `UnitStatus/GetAllUnitStatuses` - Status of all units
   
4. For real-time status tracking, monitor the `UnitStatusChanged` event from the SignalR hub or poll one of the endpoints above.

## Troubleshooting

If unit status is not being properly identified, try the following:

1. Verify the unit ID is correct (8826 for STN1)
2. Check if the unit is assigned to any active calls
3. Try the `Units/GetAllUnitsInfos` endpoint for comprehensive unit information
4. Use `confirm-stn1-status.js` to check all possible status sources
5. Look for the unit in the Dispatches array if it's not in the Activity array