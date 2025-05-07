# Resgrid to ESO Field Mapping (Final Version)

This document provides a comprehensive mapping of fields from the Resgrid system to the ESO XML format and Google Sheets logging.

## Core Incident Information

| ESO Field | Resgrid Source | Notes |
|-----------|---------------|-------|
| `Guid` | Fixed value | "b394de98-a5b7-408d-a1f2-020eddff92b9" |
| `IncidentNumber` | `CallId` | Unique identifier for the call |
| `IncidentOrOnset` | `LoggedOn` | When the incident was first reported |
| `DispatchNotified` | `LoggedOn` | When dispatch was notified |
| `ComplaintReportedByDispatch` | `Type` | Type of incident |
| `VehicleDispatchLocation` | `Address` | Full address of the incident |
| `EmsUnitCallSign` | Units from `Activity` | Filtered to include only Type="Unit" entries |
| `UnitNotifiedByDispatch` | Units from `Activity` | Same as EmsUnitCallSign |
| `CadDispatchText` | `Nature` | Detailed incident description |
| `RunNumber` | `Number` | CAD number for the incident |

## Response Information

| ESO Field | Resgrid Source | Notes |
|-----------|---------------|-------|
| `ResponseModeToScene` | Mapped from `Priority` ID and `Nature` | Maps 1560→390, 1559→395, also checks for "non-emergency" in Nature |
| `CallNature` | `Name` | Short description |
| `CallNatureDescription` | Combined `Nature` and `Note` | Detailed description with HTML tags removed |

> **Note:** The `EMD_Performed` field has been removed from XML output as of May 7, 2025. This field was previously populated from the Resgrid Priority value but is no longer included in the ESO integration. See [XML_FIELD_UPDATES.md](./XML_FIELD_UPDATES.md) for details.

## Address Components

| ESO Field | Resgrid Source | Notes |
|-----------|---------------|-------|
| `IncidentAddress1` | Parsed from `Address` | Street address |
| `IncidentCity` | Parsed from `Address` | City component |
| `IncidentState` | Parsed from `Address` | State/province |
| `IncidentZip` | Parsed from `Address` | Postal code |
| `IncidentCounty` | Parsed from `Address` | County (if available) |
| `SceneGpsLocationLat` | From `Location` | Latitude coordinate |
| `SceneGpsLocationLong` | From `Location` | Longitude coordinate |

## Contact Information

| ESO Field | Resgrid Source | Notes |
|-----------|---------------|-------|
| `ReportingParty` | `ContactName` | Name of caller |
| `ContactPhone` | `ContactInfo` | Phone number |
| `PatientFirstName` | First word from `ContactName` | First name of patient |
| `PatientLastName` | Remainder of `ContactName` | Last name of patient |
| `PatientDOB` | `ExternalId` | Date of birth (if available) |

## Unit Timestamps

| ESO Field | Resgrid Source | Notes |
|-----------|---------------|-------|
| `UnitEnRoute` | From StatusId=5 entries in Activity array | When unit started traveling to scene |
| `UnitArrivedOnScene` | From StatusId=6 entries in Activity array | When unit arrived at scene |
| `UnitAtPatient` | From StatusId=3 entries in Activity array | When unit made patient contact |
| `UnitCleared` | From StatusId=8 entries, fallback to call.ClosedOn | When unit cleared the scene |
| `UnitBackInService` | From StatusId=0 or StatusId=2 entries | When unit became available for next call |

### Status ID Mapping

The application now uses direct StatusId values for more reliable status detection:

| StatusId | StatusText | ESO Field Mapping |
|----------|------------|------------------|
| 0 | Available | UnitBackInService |
| 2 | Available | UnitBackInService (alternative) |
| 3 | Committed / At Patient | UnitAtPatient |
| 4 | Out of Service | Not directly mapped |
| 5 | Responding / En Route | UnitEnRoute |
| 6 | On Scene | UnitArrivedOnScene |
| 7 | Staging | Not directly mapped |
| 8 | Returning | UnitBackInService (primary source) |

This direct StatusId-based approach ensures reliable time extraction even when StatusText values are "Unknown" in the Resgrid data. For detailed information about the status ID mapping, see [XML_FIELD_UPDATES.md](./XML_FIELD_UPDATES.md).

## XML Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>
  <IncidentNumber>198513</IncidentNumber>
  <IncidentOrOnset>2025-05-05T20:43:21.933</IncidentOrOnset>
  <DispatchNotified>2025-05-05T20:43:21.933</DispatchNotified>
  <ComplaintReportedByDispatch/>
  <VehicleDispatchLocation>11401 Chalon Rd, Los Angeles, CA 90049, USA</VehicleDispatchLocation>
  <IncidentAddress1>11401 Chalon Rd</IncidentAddress1>
  <IncidentAddress2/>
  <IncidentCity>Los Angeles</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>90049</IncidentZip>
  <IncidentCounty/>
  <CadDispatchText>EVENT: Other - - INCIDENT TYPE: MEDICAL EMERGENCY - LOCATION: Front yard</CadDispatchText>
  <EmsUnitCallSign>STN1, STN1</EmsUnitCallSign>
  <UnitNotifiedByDispatch>STN1, STN1</UnitNotifiedByDispatch>
  <Priority>390</Priority>
  <ResponseModeToScene>390</ResponseModeToScene>
  <CrossStreets/>
  <CallNature>PERSON DOWN</CallNature>
  <CallNatureDescription>EVENT: Other - - INCIDENT TYPE: MEDICAL EMERGENCY</CallNatureDescription>
  <UnitEnRoute/>
  <UnitArrivedOnScene/>
  <UnitAtPatient/>
  <UnitCleared/>
  <SceneGpsLocationLat>34.08811</SceneGpsLocationLat>
  <SceneGpsLocationLong>-118.46246</SceneGpsLocationLong>
  <VehicleDispatchGpsLocationLat>34.08811</VehicleDispatchGpsLocationLat>
  <VehicleDispatchGpsLocationLong>-118.46246</VehicleDispatchGpsLocationLong>
  <CallClosedTime/>
  <RunNumber>25-60</RunNumber>
  <GeoLocation>
    <Latitude>34.08811</Latitude>
    <Longitude>-118.46246</Longitude>
  </GeoLocation>
  <PatientFirstName>Ryan</PatientFirstName>
  <PatientLastName>Albaugh</PatientLastName>
  <PatientPhone>(111) 111-1111</PatientPhone>
  <PatientDOB>01-01-2000</PatientDOB>
</CadIncident>
```

## Implementation Notes

- All timestamps are preserved in their original format from Resgrid
- XML is generated using xmlbuilder2 for properly formatted and escaped XML
- Units are filtered from Activity array with Type="Unit"
- Address components are parsed from the full address using regex
- Patient name is split into first/last name parts from ContactName
- All field mappings are consistent between XML generation and Google Sheets
- The ExternalId field is used for Patient DOB in both XML and Google Sheets
- Non-emergency status is detected from both Priority ID and Nature text containing "non-emergency"
- The Number field is mapped to both RunNumber in XML and CAD # in Google Sheets

## Google Sheets Integration

The application logs all call data to Google Sheets with the same field mappings for consistency:

- Timestamps: Same extraction logic as XML for consistent data
- Patient Info: Same name parsing and phone extraction
- Unit Times: Same regex matching for status detection
- Response Mode: Same detection logic for emergency vs non-emergency
- Geographic Data: Same coordinates and address parsing

This ensures that reports and exports from both systems will contain synchronized information.