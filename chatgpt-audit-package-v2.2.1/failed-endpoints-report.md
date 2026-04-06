# Resgrid API Endpoint Test Failures

Test run at: 5/7/2025, 4:09:48 AM

## Failed Endpoints (6)

### Get Call Notes
- **Path**: `/Calls/GetCallNotes?callId=198513`
- **Status Code**: 405
- **Error Type**: other
- **Error Details**: `{"Error":{"Code":"UnsupportedApiVersion","Message":"The HTTP resource that matches the request URI 'https://api.resgrid.com/api/v4/Calls/GetCallNotes' with API version '4' does not support HTTP method...`

### Get Calls in Date Range
- **Path**: `/Calls/GetCallsInDateRange?startDate=2025-05-01&endDate=2025-05-07`
- **Status Code**: 404
- **Error Type**: not_found

### Get Unit Details
- **Path**: `/Units/GetUnit?unitId=8826`
- **Status Code**: 404
- **Error Type**: not_found

### Get Department Info
- **Path**: `/Departments/GetDepartmentInfo`
- **Status Code**: 404
- **Error Type**: not_found

### Get Personnel Status
- **Path**: `/PersonnelStatuses/GetPersonnelStatus?personnelId=F1457F34-94B7-402A-964A-7FE4BCC198F7`
- **Status Code**: 404
- **Error Type**: not_found

### Get Personnel Details
- **Path**: `/Personnel/GetPersonnel?personnelId=F1457F34-94B7-402A-964A-7FE4BCC198F7`
- **Status Code**: 404
- **Error Type**: not_found

