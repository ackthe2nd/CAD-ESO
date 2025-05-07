# Resgrid API Endpoints for Integration

## Overview

This document lists verified working Resgrid API endpoints for integration with external systems. All endpoints require an authentication token and should include the full base URL.

## Authentication

```
POST https://api.resgrid.com/api/v4/Connect/token
```

Request body format (must be application/x-www-form-urlencoded):
```
grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD
```

## Base URL

All API requests must use the full base URL:

```
https://api.resgrid.com/api/v4
```

## Call Endpoints

### Get Active Calls
```
GET https://api.resgrid.com/api/v4/Calls/GetActiveCalls
```
Returns a list of all active calls.

### Get Call by ID
```
GET https://api.resgrid.com/api/v4/Calls/GetCall?callId=CALL_ID
```
Returns detailed information about a specific call.

### Get Call Extra Data
```
GET https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=CALL_ID
```
Returns additional data for a call, including unit activities and dispatches.

## Unit Status Endpoints

### Get Unit Status by ID
```
GET https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId=UNIT_ID
```
Returns the current status of a specific unit. This is the most reliable method for getting unit status.

### Get All Units
```
GET https://api.resgrid.com/api/v4/Units/GetAllUnits
```
Returns a list of all units with their current status information.

## Reference Data Endpoints

### Get All Call Types
```
GET https://api.resgrid.com/api/v4/CallTypes/GetAllCallTypes
```
Returns a list of all call types in the system.

### Get All Call Priorities
```
GET https://api.resgrid.com/api/v4/CallPriorities/GetAllCallPriorites
```
Returns a list of all call priorities in the system.

### Get All Call Protocols
```
GET https://api.resgrid.com/api/v4/CallProtocols/GetAllCallProtocols
```
Returns a list of all call protocols in the system.

### Get All Unit Status Definitions
```
GET https://api.resgrid.com/api/v4/Statuses/GetAllUnitStatuses
```
Returns definitions for all unit status values.

### Get All Department Groups
```
GET https://api.resgrid.com/api/v4/Groups/GetAllGroups
```
Returns a list of all department groups.

### Get Autofills
```
GET https://api.resgrid.com/api/v4/Autofills/GetAllAutofills
```
Returns a list of all autofill templates for call creation.

## Personnel Endpoints

### Get All Personnel Infos
```
GET https://api.resgrid.com/api/v4/Personnel/GetAllPersonnelInfos
```
Returns information about all personnel in the department.

## Status Code Mapping

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

## Response Format

All successful responses follow a standard format:

```json
{
  "Data": [ ... ] or { ... },
  "PageSize": 0,
  "Page": 0,
  "Timestamp": "2025-05-07T04:07:06.1754551Z",
  "Version": "v4",
  "Node": "..."
}
```

The actual data is always in the `Data` property. Always check the Data property for response content.

## Best Practices

1. **Use Full URLs**: Always include the complete base URL in all requests
2. **Check Data Property**: Always access the .Data property to get the actual response data
3. **Use Unit IDs**: When fetching unit status, always use the numeric unit ID rather than the name
4. **Token Management**: Implement token caching with at least 15 minutes refresh margin
5. **Activity Data**: Check both the Activity and Dispatches arrays in call data for complete unit information
6. **Error Handling**: Implement retry mechanisms with exponential backoff for network failures
7. **XML Generation**: The `<EMD_Performed>` tag has been removed from XML output as it's no longer required. See [XML_FIELD_UPDATES.md](./XML_FIELD_UPDATES.md) for details.

## Corrected Endpoint References

Some endpoints require specific parameters or have different paths than initially tested:

### Calls in Date Range
```
GET https://api.resgrid.com/api/v4/Calls/GetCalls?startDate=2025-05-04%2012%3A47%3A44&endDate=2025-05-05%2020%3A43%3A22
```
Returns calls within a specified date range. Note the endpoint is `GetCalls` (not `GetCallsInDateRange`), and dates must be URL-encoded.

### Personnel Information
```
GET https://api.resgrid.com/api/v4/Personnel/GetPersonnelInfo?userId=F1457F34-94B7-402A-964A-7FE4BCC198F7
```
Returns detailed information about a personnel member. Must use `userId` parameter, not `personnelId`.

### Personnel Status
```
GET https://api.resgrid.com/api/v4/PersonnelStatuses/GetCurrentStatus?userId=F1457F34-94B7-402A-964A-7FE4BCC198F7
```
Returns a personnel member's current status. Must use `userId` parameter.

## Non-Working Endpoints

The following endpoints were tested but do not appear to exist or work:

- `GET /Calls/GetCallNotes` - Returns 405 Method Not Allowed
- `GET /Units/GetUnit` - Returns 404
- `GET /Departments/GetDepartmentInfo` - Returns 404

## SignalR Integration

For real-time events, connect to the Resgrid SignalR hub:

```
wss://events.resgrid.com/eventingHub
```

Key events to monitor:
- `CallAdded` - Triggered when a new call is added
- `UnitStatusChanged` - Triggered when a unit's status changes