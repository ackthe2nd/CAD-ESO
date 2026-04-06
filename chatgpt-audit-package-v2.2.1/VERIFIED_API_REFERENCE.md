# Resgrid API Documentation

*Generated: 5/7/2025, 4:28:45 AM*

This documentation is based on actual API testing and provides verified endpoints for Resgrid integration.

## Base URL

All API requests must use the full base URL:

```
https://api.resgrid.com/api/v4
```

## Authentication

### Authentication Token

`POST https://api.resgrid.com/api/v4/Connect/token`

Request body format (must be application/x-www-form-urlencoded):
```
grant_type=password&username=YOUR_USERNAME&password=YOUR_PASSWORD
```

Returns a JWT token that must be included in the Authorization header for all other requests.

## Calls Endpoints

### Get Active Calls

`GET https://api.resgrid.com/api/v4/Calls/GetActiveCalls`

Get all active calls.

Returns an array of items with the following fields: CallId, Priority, Name, Nature, Note, Address, Geolocation, LoggedOn, State, Number, NotesCount, AudioCount, ImgagesCount, FileCount, What3Words, ContactName, ContactInfo, ReferenceId, ExternalId, IncidentId, AudioFileId, Type, LoggedOnUtc, DispatchedOn, DispatchedOnUtc, Latitude, Longitude, Protocols.

### Get Call by ID

`GET https://api.resgrid.com/api/v4/Calls/GetCall`

Get detailed information about a specific call.

Returns an object with the following properties: CallId, Priority, Name, Nature, Note, Address, Geolocation, LoggedOn, State, Number, NotesCount, AudioCount, ImgagesCount, FileCount, What3Words, ContactName, ContactInfo, ReferenceId, ExternalId, IncidentId, AudioFileId, Type, LoggedOnUtc, DispatchedOn, DispatchedOnUtc, Latitude, Longitude, Protocols.

### Get Call Extra Data

`GET https://api.resgrid.com/api/v4/Calls/GetCallExtraData`

Get additional data for a call including unit activities.

Returns an object with the following properties: CallFormData, Activity, Dispatches, Priority, Protocols.

### Get Calls in Date Range

`GET https://api.resgrid.com/api/v4/Calls/GetCalls`

Get calls within a specific date range.

Returns an array of items with the following fields: CallId, Priority, Name, Nature, Note, Address, Geolocation, LoggedOn, State, Number, NotesCount, AudioCount, ImgagesCount, FileCount, What3Words, ContactName, ContactInfo, ReferenceId, ExternalId, IncidentId, AudioFileId, Type, LoggedOnUtc, DispatchedOn, DispatchedOnUtc, Latitude, Longitude, Protocols.

## Unit Status Endpoints

### Get Unit Status by ID

`GET https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus`

Get the current status of a specific unit.

Returns an object with the following properties: UnitId, Name, Type, State, StateCss, StateStyle, Timestamp, TimestampUtc, DestinationId, DestinationName, Note, Latitude, Longitude, GroupName, GroupId.

### Get All Unit Statuses

`GET https://api.resgrid.com/api/v4/UnitStatus/GetAllUnitStatuses`

Get statuses of all units.

Returns an array of items with the following fields: UnitId, Name, Type, State, StateCss, StateStyle, Timestamp, TimestampUtc, DestinationId, DestinationName, Note, Latitude, Longitude, GroupName, GroupId.

## Units Endpoints

### Get All Units

`GET https://api.resgrid.com/api/v4/Units/GetAllUnits`

Get all units with their current status information.

Returns an array of items with the following fields: UnitId, DepartmentId, Name, Type, TypeId, CustomStatusSetId, GroupId, GroupName, Vin, PlateNumber, FourWheelDrive, SpecialPermit, CurrentDestinationId, CurrentStatusId, CurrentStatusTimestamp, Latitude, Longitude, Note.

### Get All Unit Infos

`GET https://api.resgrid.com/api/v4/Units/GetAllUnitsInfos`

Get detailed information about all units.

Returns an array of items with the following fields: UnitId, DepartmentId, Name, Type, TypeId, CustomStatusSetId, GroupId, GroupName, Vin, PlateNumber, FourWheelDrive, SpecialPermit, CurrentDestinationId, CurrentDestinationName, CurrentStatusId, CurrentStatus, CurrentStatusColor, CurrentStatusTimestamp, CurrentStatusTimestampUtc, Latitude, Longitude, Note, Roles.

## Status Definitions Endpoints

### Get All Unit Status Definitions

`GET https://api.resgrid.com/api/v4/Statuses/GetAllUnitStatuses`

Get definitions for all unit status values.

Returns an array of items with the following fields: UnitType, StatusId, Statuses.

## Reference Data Endpoints

### Get All Call Types

`GET https://api.resgrid.com/api/v4/CallTypes/GetAllCallTypes`

Get all call types.

Returns an array of items with the following fields: Id, Name.

### Get All Call Priorities

`GET https://api.resgrid.com/api/v4/CallPriorities/GetAllCallPriorites`

Get all call priorities.

Returns an array of items with the following fields: Id, DepartmentId, Name, Color, Sort, IsDeleted, IsDefault, DispatchPersonnel, DispatchUnits, ForceNotifyAllPersonnel, Tone, IsSystemPriority.

### Get All Call Protocols

`GET https://api.resgrid.com/api/v4/CallProtocols/GetAllCallProtocols`

Get all call protocols.

Returns an array of items with the following fields: Id, DepartmentId, Name, Code, IsDisabled, Description, ProtocolText, CreatedOn, CreatedByUserId, UpdatedOn, MinimumWeight, UpdatedByUserId, Triggers, Attachments, Questions, State.

## Personnel Endpoints

### Get All Personnel Infos

`GET https://api.resgrid.com/api/v4/Personnel/GetAllPersonnelInfos`

Get information about all personnel.

Returns an array of items with the following fields: UserId, DepartmentId, IdentificationNumber, FirstName, LastName, EmailAddress, MobilePhone, GroupId, GroupName, Roles, StatusId, Status, StatusColor, StatusTimestamp, StatusDestinationId, StatusDestinationName, StaffingId, Staffing, StaffingColor, StaffingTimestamp, Location, Weight.

### Get Personnel Info

`GET https://api.resgrid.com/api/v4/Personnel/GetPersonnelInfo`

Get information about a specific personnel member.

Returns an object with the following properties: UserId, DepartmentId, IdentificationNumber, FirstName, LastName, EmailAddress, MobilePhone, GroupId, GroupName, Roles, StatusId, Status, StatusColor, StatusTimestamp, StatusDestinationId, StatusDestinationName, StaffingId, Staffing, StaffingColor, StaffingTimestamp, Location, Weight.

### Get Current Personnel Status

`GET https://api.resgrid.com/api/v4/PersonnelStatuses/GetCurrentStatus`

Get current status of a specific personnel member.

Returns null data.

## Department Endpoints

### Get All Department Groups

`GET https://api.resgrid.com/api/v4/Groups/GetAllGroups`

Get all department groups.

Returns an array of items with the following fields: GroupId, TypeId, Name, Address.

### Get Autofills

`GET https://api.resgrid.com/api/v4/Autofills/GetAllAutofills`

Get all autofill templates for call creation.

Returns an array of items.

## Status Code Reference

| StatusId | Text | Description | Usage in Integration |
|----------|------|-------------|--------|
| 0 | Available | Unit is available for dispatch | Back in Service (fallback) |
| 2 | Available | Alternative for available status | Back in Service (fallback) |
| 3 | Committed | Unit is at patient | At Patient time |
| 5 | Responding / En Route | Unit is en route to the call | En Route time |
| 6 | On Scene | Unit has arrived at the scene | Arrived on Scene time |
| 8 | Returning | Unit is returning to station | Back in Service time |

## Best Practices

1. **Use Full URLs**: Always include the complete base URL in all requests
2. **Check Data Property**: Always access the .Data property to get the actual response data
3. **Use Unit IDs**: When fetching unit status, always use the numeric unit ID rather than the name
4. **Token Management**: Implement token caching with at least 15 minutes refresh margin
5. **Activity Data**: Check both the Activity and Dispatches arrays in call data for complete unit information
6. **Error Handling**: Implement retry mechanisms with exponential backoff for network failures

