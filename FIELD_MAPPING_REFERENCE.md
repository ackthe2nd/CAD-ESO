# Resgrid to ESO and Google Sheets Field Mapping

This document provides a comprehensive reference for field mappings between Resgrid data sources and the two output formats:
1. XML for ESO
2. Google Sheets for logging

## Google Sheets Headers

The following headers are used in the enhanced Google Sheets export:

| Column | Header Name |
|--------|-------------|
| A | Timestamp |
| B | Call ID |
| C | Call Type |
| D | XML |
| E | Nature |
| F | Note |
| G | Address |
| H | City |
| I | State |
| J | Zip |
| K | Latitude |
| L | Longitude |
| M | Priority |
| N | Response Mode |
| O | Unit Name/Unit ID |
| P | En Route Time |
| Q | On Scene Time |
| R | At Patient Time |
| S | Cleared Time |
| T | Patient First Name |
| U | Patient Last Name |
| V | Patient Phone |
| W | Patient DOB/ID |

## Field Mapping Table (Updated)

| Resgrid Source | Resgrid Field | XML Output (ESO) | Google Sheets Column |
|----------------|---------------|------------------|---------------------|
| Call | CallId | IncidentNumber | Call ID |
| Call | LoggedOn | IncidentOrOnset, DispatchNotified | Timestamp |
| Call | Name | CallNature | Nature |
| Call | Type | ComplaintReportedByDispatch | Call Type |
| *N/A* | *N/A* | *Complete XML for call* | XML |
| Call | Address | IncidentAddress1 | Address |
| Call | Nature + Note | CallNatureDescription | Note |
| Call | City (parsed) | IncidentCity | City |
| Call | State (parsed) | IncidentState | State |
| Call | Zip (parsed) | IncidentZip | Zip |
| Call Priority | Priority ID | *used for ResponseModeToScene mapping* | Priority |
| Dispatches | Unit Type="Unit" | EmsUnitCallSign, UnitNotifiedByDispatch | Unit Name/Unit ID |
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
  <EmsUnitCallSign>[Unit.Name]</EmsUnitCallSign>
  <UnitNotifiedByDispatch>[Unit.Name]</UnitNotifiedByDispatch>
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
3. **Unit Information**: Extracted from the `Dispatches` array in call extra data
4. **Status Timestamps**: Extracted from the `Activity` array in call extra data
5. **Address Parsing**: The Address field is parsed to extract City, State, and Zip components
6. **Patient Information**: Contact name is parsed to extract first and last name components
7. **XML Generation**: Complete XML document is generated for each call and included in column D

## XML Export to Google Sheets

The enhanced export script now includes the full XML content in column D of the Google Sheet. This provides:

1. **Complete Data Record**: A self-contained record of all data including the structured XML used for ESO
2. **Validation Capability**: Ability to verify XML format directly in Google Sheets
3. **Troubleshooting Support**: Makes it easier to identify any missing or malformed data
4. **Audit Trail**: Provides a complete history of all exported XML content for review

This feature ensures that stakeholders can view both the structured data in individual columns and the complete XML representation without needing access to the server file system.