# Resgrid to ESO and Google Sheets Field Mapping

This document provides a comprehensive reference for field mappings between Resgrid data sources and the two output formats:
1. XML for ESO
2. Google Sheets for logging

## Google Sheets Headers

The following headers are used in the enhanced Google Sheets export:

| Column | Header Name | Description |
|--------|-------------|-------------|
| A | Call Received Time | Pacific Time timestamp when call was received |
| B | Emergency Call ID | Unique call identifier from Resgrid |
| C | Priority Description | Call priority and response mode |
| D | Responding Units | Units assigned to the call |
| E | Call Title | Brief call description |
| F | Incident Type | Type of emergency incident |
| G | Incident Details | Complete incident description |
| H | Emergency Address | Primary emergency location |
| I | Address Line 1 | Street address component |
| J | Address Line 2 | Additional address details |
| K | City | City from address parsing |
| L | State | State from address parsing |
| M | ZIP Code | ZIP code from address parsing |
| N | GPS Latitude | Latitude coordinates |
| O | GPS Longitude | Longitude coordinates |
| P | Additional Notes | Extra call information |
| Q | Patient/Caller Name | Patient or caller identification |
| R | Contact Information | Phone or contact details |
| S | Patient DOB | Patient date of birth or ID |
| T | Call Closed Time | Time when call was closed |
| U | Record Created | When record was created in system |
| V | Last Updated | Last modification timestamp |
| W | Number of Units | Count of responding units |
| X | Unit Dispatched Times | When units were dispatched |
| Y | Unit En Route Times | When units went en route |
| Z | Unit Arrived Times | When units arrived on scene |
| AA | Unit At Patient Times | When units reached patient |
| BB | Unit Cleared Times | When units cleared the scene |
| CC | Unit Back In Service Times | When units returned to service |
| DD | Unit Transport Times | When transport began |
| EE | Unit At Hospital Times | When units arrived at hospital |
| FF | Call Closed | Call closure status |
| GG | Response Mode | Type of response (emergency/non-emergency) |
| HH | Priority Level | Numerical priority level |
| II | Generated XML | Complete XML sent to ESO |
| JJ | ESO Upload Status | Upload success/failure status |
| KK | Test Call | Whether this was a test call |
| LL | Test Result | Result of test operations |
| MM | Location | Precise location extracted from LOCATION: fields |

## Field Mapping Table (Updated)

| Resgrid Source | Resgrid Field | XML Output (ESO) | Google Sheets Column |
|----------------|---------------|------------------|---------------------|
| Call | CallId | IncidentNumber | Emergency Call ID |
| Call | LoggedOn | IncidentOrOnset, DispatchNotified | Call Received Time |
| Call | Name | CallNature | Call Title |
| Call | Type | ComplaintReportedByDispatch | Incident Type |
| Call | Nature | CadDispatchText | Incident Details |
| Call | Nature (LOCATION: extraction) | *Not included in XML* | Location |
| Call | Address | IncidentAddress1 | Emergency Address |
| Call | City (parsed) | IncidentCity | City |
| Call | State (parsed) | IncidentState | State |
| Call | Zip (parsed) | IncidentZip | ZIP Code |
| Call Priority | Priority ID | *used for ResponseModeToScene mapping* | Priority |
| Dispatches | Unit Type="Unit" Names | EmsUnitCallSign (comma-separated unit names), UnitNotifiedByDispatch | Unit Name/Unit ID |
| *Mapping* | Priority 1559 | ResponseModeToScene="395" (Cold) | Response Mode |
| *Mapping* | Priority 1560 | ResponseModeToScene="390" (Hot) | Response Mode |
| Activity | StatusId=5 Time | UnitEnRoute | En Route Time |
| Activity | StatusId=6 Time | UnitArrivedOnScene | On Scene Time |
| Activity | StatusId=3 Time | UnitAtPatient | At Patient Time |
| Activity | StatusId=2/0/8 Time | UnitCleared, UnitBackInService | Cleared Time |
| Call | Geolocation | SceneGpsLocationLat, SceneGpsLocationLong | Latitude, Longitude |
| Call | ContactName | PatientFirstName, PatientLastName | Patient First Name, Patient Last Name |
| Call | ContactInfo | PatientPhone | Patient Phone |
| Call | ExternalId | PatientDOB | Patient DOB/ID |
| *N/A* | *N/A* | Guid (fixed UUID) | *N/A* |

## Complete XML Structure for ESO

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>
  <IncidentNumber>[Call.CallId]</IncidentNumber>
  <IncidentOrOnset>[Call.LoggedOn]</IncidentOrOnset>
  <DispatchNotified>[Call.LoggedOn]</DispatchNotified>
  <ComplaintReportedByDispatch>[Call.Type]</ComplaintReportedByDispatch>
  <IncidentAddress1>[Call.Address]</IncidentAddress1>
  <IncidentCity>[Parsed from Address]</IncidentCity>
  <IncidentState>[Parsed from Address]</IncidentState>
  <IncidentZip>[Parsed from Address]</IncidentZip>
  <CadDispatchText>[Call.Nature]</CadDispatchText>
  <EmsUnitCallSign>[Comma-separated unit names (e.g., "STN1,BLS11")]</EmsUnitCallSign>
  <UnitNotifiedByDispatch>[Comma-separated unit names (e.g., "STN1,BLS11")]</UnitNotifiedByDispatch>
  <ResponseModeToScene>[390/395 based on priority]</ResponseModeToScene>
  <CallNature>[Call.Name]</CallNature>
  <CallNatureDescription>[Call.Nature + Call.Note]</CallNatureDescription>
  <UnitEnRoute>[Unit StatusId=5 Timestamp]</UnitEnRoute>
  <UnitArrivedOnScene>[Unit StatusId=6 Timestamp]</UnitArrivedOnScene>
  <UnitAtPatient>[Unit StatusId=3 Timestamp]</UnitAtPatient>
  <UnitCleared>[Unit StatusId=2/0/8 Timestamp]</UnitCleared>
  <UnitBackInService>[Unit StatusId=2/0/8 Timestamp]</UnitBackInService>
  <SceneGpsLocationLat>[Call.Geolocation Lat]</SceneGpsLocationLat>
  <SceneGpsLocationLong>[Call.Geolocation Long]</SceneGpsLocationLong>
  <PatientFirstName>[Parsed from Call.ContactName]</PatientFirstName>
  <PatientLastName>[Parsed from Call.ContactName]</PatientLastName>
  <PatientPhone>[Call.ContactInfo]</PatientPhone>
  <PatientDOB>[Call.ExternalId]</PatientDOB>
</CadIncident>
```

**Note:** The `<EMD_Performed>` tag has been removed per updated requirements.

## Response Mode Mapping

The Response Mode mapping is determined based on the priority value:

| Priority ID | Description | Response Mode |
|-------------|-------------|---------------|
| 1559 | Non-emergent (no lights & sirens) | 395 |
| 1560 | Emergent (lights & sirens) | 390 |

Additionally, if the nature field contains certain keywords like "non-emergency" or "routine", the response mode will be set to "395" (non-emergency) regardless of the priority.

## Status Code Mapping

The following status codes are used to map unit status in Resgrid to various timestamps:

| Status ID | Status Description | Used For |
|-----------|-------------------|----------|
| 0 | Available | Cleared Time & Back In Service Time |
| 2 | Available | Cleared Time & Back In Service Time |
| 3 | Committed / At Patient | At Patient Time |
| 4 | Out of Service | *Not used in export* |
| 5 | En Route / Responding | En Route Time |
| 6 | On Scene | On Scene Time |
| 7 | Staging | *Not used in export* |
| 8 | Returning | Cleared Time & Back In Service Time |
| 9 | *Not defined* | *Not used in export* |

## Google Sheets Implementation Details

When pushing data to Google Sheets, the script:

1. Authenticates using service account credentials
2. Formats the data according to the headers specified above
3. Appends a new row to the sheet using the `spreadsheets.values.append` method
4. Specifies `valueInputOption: 'USER_ENTERED'` to allow for proper date formatting
5. Uses `insertDataOption: 'INSERT_ROWS'` to add data at the top of the sheet

Example code for sheet append:

```javascript
const result = await sheets.spreadsheets.values.append({
  spreadsheetId: SPREADSHEET_ID,
  range: 'Calls!A1:W1', // Match the headers length (A-W for all 23 fields)
  valueInputOption: 'USER_ENTERED',
  insertDataOption: 'INSERT_ROWS',
  resource: {
    values: [values] // Array of values matching the columns
  }
});
```

## Data Extraction Process

1. **Basic Call Data**: Retrieved from Resgrid API endpoint `Calls/GetActiveCalls` or `Calls/GetCalls`
2. **Detailed Call Data**: Retrieved from `Calls/GetCallExtraData?callId=X`
3. **Nested Data Structure**: Both call data and extra data may contain a nested `Data` property that holds the actual content
4. **Unit Information**: Extracted from multiple sources in order of reliability:
   - First from the `Activity` array in the nested Data property
   - Then from the `Dispatches` array in extra data
   - Finally from dispatch notes using regular expressions
   - Multiple unit names are combined with commas (e.g., "STN1,BLS11")
5. **Status Timestamps**: Extracted from the `Activity` array in the nested Data property with appropriate status code mapping
6. **Address Parsing**: The Address field is parsed to extract City, State, and Zip components
7. **Patient Information**: Contact name is parsed to extract first and last name components
8. **XML Generation**: Complete XML document is generated for each call and included in the XML column

### Nested Data Structure Support

As of v1.4.9, the application supports the nested data structure returned by the Resgrid API:

```javascript
// Sample API response structure:
{
  "Data": {                 // <-- Nested property containing actual data
    "CallFormData": { /*...*/ },
    "Activity": [           // <-- Unit activity information here
      {
        "Id": "78227",
        "Timestamp": "2025-05-10T02:21:27.85",
        "Type": "Unit",
        "Name": "STN1",     // <-- Unit name extracted from here
        "StatusId": 5,      // <-- Status code for en route
        "Location": "34.19723919812224,-118.4624331406047"
      }
    ],
    "Dispatches": [         // <-- Dispatched resources
      {
        "Type": "User",     // <-- Can also be "Unit" in some responses
        "Name": "Alec Buckner"
      }
    ],
    "Priority": { /*...*/ },
    "Protocols": [ /*...*/ ]
  },
  "PageSize": 100,
  "Page": 1,
  "Timestamp": "2025-05-10T02:53:57.029Z",
  // Other metadata...
}
```

The application automatically detects whether data is in the nested format or the previous direct format, providing backward compatibility.

## XML Export to Google Sheets

The enhanced export script now includes the full XML content in column D of the Google Sheet. This provides:

1. **Complete Data Record**: A self-contained record of all data including the structured XML used for ESO
2. **Validation Capability**: Ability to verify XML format directly in Google Sheets
3. **Troubleshooting Support**: Makes it easier to identify any missing or malformed data
4. **Audit Trail**: Provides a complete history of all exported XML content for review

This feature ensures that stakeholders can view both the structured data in individual columns and the complete XML representation without needing access to the server file system.