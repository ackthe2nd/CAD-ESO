# Unit Status Monitoring Guide

This guide provides information about monitoring unit status in the Resgrid system, with a focus on the STN1 unit.

## Unit Information

The STN1 unit has been verified to have the following properties:

- **Unit ID**: 8826
- **Unit Name**: STN1
- **Unit Type**: Medical Station

## Status Monitoring Scripts

The following scripts are available for monitoring unit status:

### 1. Basic Status Check (`status-test.js`)

This script performs a basic check of STN1's status by looking through active calls.

```bash
node status-test.js
```

**Features:**
- Scans all active calls for STN1 activity
- Reports StatusId values found in activity arrays
- Simple output format

### 2. Real-time Monitoring (`monitor-stn1-status-fixed.js`)

This script provides continuous monitoring of STN1's status with color-coded output.

```bash
# Run once
node monitor-stn1-status-fixed.js

# Monitor continuously (updates when status changes)
node monitor-stn1-status-fixed.js monitor
```

**Features:**
- Color-coded status display
- Checks multiple API endpoints for status data
- Only shows updates when status changes
- Includes token refresh for long-running sessions
- Handles connection errors gracefully

### 3. Comprehensive Status Check (`confirm-stn1-status.js`)

This script provides a complete verification of STN1's status across all available API endpoints.

```bash
node confirm-stn1-status.js
```

**Features:**
- Checks multiple API endpoints
- Detailed reporting of found data
- Summary section with most reliable status
- Examines all active calls for unit activity
- Retrieves status definitions when available

## Status Codes Reference

The following status codes have been verified for STN1:

| StatusId | Status Text | Description | 
|----------|-------------|-------------|
| 0 | Available | Unit is available for service |
| 2 | Available | Alternative code for available |
| 3 | Committed | Unit is with patient |
| 4 | Out of Service | Unit is unavailable |
| 5 | Responding | Unit is en route to call |
| 6 | On Scene | Unit has arrived at scene |
| 7 | Staging | Unit is staged near scene |
| 8 | Returning | Unit is returning to station |

## Best Practices

1. **Use Unit ID**: Always use the numeric Unit ID (8826) rather than the name when querying status
2. **Check Multiple Sources**: For reliable status, check both direct status endpoints and active calls
3. **Use Active Calls**: The most comprehensive status information is found in call activity arrays
4. **StatusId First**: Rely on StatusId values rather than StatusText, as StatusText may be "Unknown"
5. **Monitor for Changes**: Use the monitor mode of `monitor-stn1-status-fixed.js` for real-time monitoring

## Troubleshooting

If you're having trouble finding STN1's status:

1. **Verify API Token**: Ensure your Resgrid API token is valid
2. **Check in All Units**: Use the `Units/GetAllUnitsInfos` endpoint to find the unit in the complete list
3. **Examine Call Activity**: Look through active calls for the unit in Activity and Dispatches arrays
4. **Status ID Map**: Refer to the status code table above to interpret StatusId values
5. **Try Multiple Endpoints**: Some endpoints may be more reliable than others, try several
6. **Run Comprehensive Check**: Use `confirm-stn1-status.js` to check all possible status sources

## Detailed Status Identification Process

The application uses the following process to determine unit status:

1. Try direct unit status endpoint: `UnitStatus/GetUnitStatus?unitId=8826`
2. If not found, check all units: `Units/GetAllUnitsInfos`
3. If not found, check all unit statuses: `UnitStatus/GetAllUnitStatuses`
4. If not found, scan all active calls for the unit in Activity arrays
5. If not found, check active call Dispatches arrays

For the most reliable status, use active calls data when available, as it provides the most context about the unit's current assignment and activities.