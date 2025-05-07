# Status Code Reference

This document provides a quick reference for Resgrid unit status codes used in the Resgrid-ESO Bridge integration.

## Unit Status Codes

| StatusId | Status Text | Description | Usage in Integration |
|----------|-------------|-------------|---------------------|
| 0 | Available | Unit is available for dispatch | Back in Service (fallback) |
| 2 | Available | Alternative for available status | Back in Service (fallback) |
| 3 | Committed | Unit is at patient | At Patient time |
| 4 | Out of Service | Unit is unavailable | Not used directly |
| 5 | Responding / En Route | Unit is en route to the call | En Route time |
| 6 | On Scene | Unit has arrived at the scene | Arrived on Scene time |
| 7 | Staging | Unit is staged near the scene | Not used directly |
| 8 | Returning | Unit is returning to station | Back in Service time |

## Unit Status Hierarchy

When multiple status updates are available, the following hierarchy is used:

1. Most recent timestamp takes precedence
2. For Back in Service time: StatusId 8 (Returning) > StatusId 0/2 (Available) > Call.ClosedOn
3. For At Patient time: StatusId 3 (Committed) is used exclusively
4. For En Route time: StatusId 5 (Responding) is used exclusively
5. For On Scene time: StatusId 6 (On Scene) is used exclusively

## API Endpoints for Status Checks

The following endpoints can be used to check unit status:

```
GET https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId=8826
GET https://api.resgrid.com/api/v4/Units/GetAllUnitsInfos
GET https://api.resgrid.com/api/v4/UnitStatus/GetAllUnitStatuses
GET https://api.resgrid.com/api/v4/Calls/GetActiveCalls (followed by GetCallExtraData for call activity)
```

## Unit Properties

Unit STN1 has the following verified properties:

- **Unit ID**: 8826
- **Unit Name**: STN1
- **Unit Type**: Medical Station

## Monitoring Tools

The following scripts can be used to monitor unit status:

```bash
# Basic status check
node status-test.js

# Real-time monitoring (continuous)
node monitor-stn1-status-fixed.js monitor

# One-time comprehensive status check
node confirm-stn1-status.js
```

## Troubleshooting Status Issues

If you are having trouble getting the correct unit status:

1. Check that you are using the correct unit ID (8826)
2. Verify the unit is currently on an active call (use `GetActiveCalls`)
3. Check call activity arrays for status updates
4. If status appears stuck, try the Units/GetAllUnitsInfos endpoint
5. Consult [UNIT_STATUS_GUIDE.md](UNIT_STATUS_GUIDE.md) for more detailed troubleshooting

For additional debugging, see [XML_FIELD_UPDATES.md](XML_FIELD_UPDATES.md) for detailed documentation of the status ID mapping and verification process.