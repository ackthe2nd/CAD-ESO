# Resgrid API Reference

This document provides a comprehensive reference of the Resgrid API endpoints that are relevant to the Resgrid-ESO Bridge application.

## Base URL

All API endpoints begin with: `https://api.resgrid.com/api/v4/`

## Authentication

| Endpoint | Method | Description | Parameters | Notes |
|----------|--------|-------------|------------|-------|
| `https://api.resgrid.com/api/v4/Connect/token` | POST | Generates an authentication token | `grant_type=password&username={username}&password={password}` | Token is required for all other API requests |

## Call Endpoints

| Endpoint | Method | Description | Parameters | Notes |
|----------|--------|-------------|------------|-------|
| `https://api.resgrid.com/api/v4/Calls/GetActiveCalls` | GET | Returns all active calls for the department | None | Call data in `response.data.Data` |
| `https://api.resgrid.com/api/v4/Calls/GetCallsInDateRange` | GET | Returns all calls within a date range | `startDate`, `endDate` | Format: YYYY-MM-DD |
| `https://api.resgrid.com/api/v4/Calls/GetCallExtraData` | GET | Gets detailed data for a specific call | `callId` | Includes unit activities, dispatches, and more |

## Unit Status Endpoints

| Endpoint | Method | Description | Parameters | Notes |
|----------|--------|-------------|------------|-------|
| `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus` | GET | Gets status for a specific unit | `unitId` | Must use numeric unit ID, not name |
| `https://api.resgrid.com/api/v4/UnitStatus/GetAllUnitStatuses` | GET | Gets all units' current status | None | Status data for all units |
| `https://api.resgrid.com/api/v4/Units/GetAllUnits` | GET | Gets all units in the department | None | Includes current status ID |
| `https://api.resgrid.com/api/v4/Statuses/GetAllUnitStatuses` | GET | Gets all status definitions | None | Status codes and their text values |

## Personnel Status Endpoints

| Endpoint | Method | Description | Parameters | Notes |
|----------|--------|-------------|------------|-------|
| `https://api.resgrid.com/api/v4/PersonnelStatuses/GetCurrentStatus` | GET | Gets status for a specific person | `userId` | Current user status |

## Location Endpoints

| Endpoint | Method | Description | Parameters | Notes |
|----------|--------|-------------|------------|-------|
| `https://api.resgrid.com/api/v4/UnitLocation/GetLatestUnitLocation` | GET | Gets latest location for a unit | `unitId` | Location data for a specific unit |

## Detailed Endpoint Usage

### Unit Status Endpoints

#### 1. Get Status for Specific Unit

```
GET https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId=8826
```

This endpoint returns detailed information about a specific unit's status. You must use the numeric unit ID (not the unit name).

**Example Response:**
```json
{
  "Data": {
    "UnitId": "8826",
    "Name": "STN1",
    "Type": "Medical Station",
    "State": "Available",
    "StateCss": "label-default",
    "StateStyle": "label-default",
    "Timestamp": "2025-05-06T20:49:16.297",
    "TimestampUtc": "2025-05-07T03:49:16.297",
    "DestinationId": null,
    "DestinationName": "",
    "Note": null,
    "Latitude": 34.197214157615015,
    "Longitude": -118.46247106866808,
    "GroupName": "",
    "GroupId": 0
  }
}
```

#### 2. Get All Units with Status

```
GET https://api.resgrid.com/api/v4/Units/GetAllUnits
```

This endpoint returns all units in the department with their basic information and current status ID.

**Example Response:**
```json
{
  "Data": [
    {
      "UnitId": "8826",
      "DepartmentId": "11682",
      "Name": "STN1",
      "Type": "Medical Station",
      "CurrentStatusId": "0",
      "CurrentStatusTimestamp": "2025-05-06T20:49:16.297"
    },
    {
      "UnitId": "8825",
      "DepartmentId": "11682",
      "Name": "STN2",
      "Type": "Medical Station",
      "CurrentStatusId": "4",
      "CurrentStatusTimestamp": "2025-04-27T03:15:15.247"
    }
  ]
}
```

#### 3. Get Status Definitions

```
GET https://api.resgrid.com/api/v4/Statuses/GetAllUnitStatuses
```

This endpoint returns the definitions of all possible unit status values.

**Example Response:**
```json
{
  "Data": [
    {
      "UnitType": "0",
      "StatusId": null,
      "Statuses": [
        {
          "Id": 0,
          "Type": 2,
          "StateId": 0,
          "Text": "Available",
          "BColor": "#d1dade",
          "Color": "5E5E5E"
        },
        {
          "Id": 3,
          "Type": 2,
          "StateId": 0,
          "Text": "Committed",
          "BColor": "#50b8de",
          "Color": "#ffffff"
        },
        {
          "Id": 5,
          "Type": 2,
          "StateId": 0,
          "Text": "Responding",
          "BColor": "#32db64",
          "Color": "#ffffff"
        }
      ]
    }
  ]
}
```

### Call Endpoints

#### 1. Get Active Calls

```
GET https://api.resgrid.com/api/v4/Calls/GetActiveCalls
```

This endpoint returns all active calls for the department.

#### 2. Get Call Extra Data

```
GET https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=198513
```

This endpoint returns detailed information about a specific call, including unit activities and status changes.

## Status Code Mapping

| StatusId | Text | Description | Usage |
|----------|------|-------------|-------|
| 0 | Available | Unit is available for dispatch | Back in Service (fallback) |
| 3 | Committed | Unit is at patient | At Patient time |
| 4 | Out of Service | Unit is unavailable | Not used directly |
| 5 | Responding | Unit is en route to the call | En Route time |
| 6 | On Scene | Unit has arrived at the scene | Arrived on Scene time |
| 7 | Staging | Unit is staged near the scene | Not used directly |
| 8 | Returning | Unit is returning to station | Back in Service time |

## Implementation Notes

1. Always use numeric Unit IDs (not names) with the `UnitStatus/GetUnitStatus` endpoint
2. The most reliable method to get a unit's status is through the `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId={unitId}` endpoint
3. For getting all units' status at once, use the `https://api.resgrid.com/api/v4/Units/GetAllUnits` endpoint
4. Status changes are also recorded in call activities, which can be accessed via `https://api.resgrid.com/api/v4/Calls/GetCallExtraData`
5. Always include the full base URL (`https://api.resgrid.com/api/v4/`) in your API requests