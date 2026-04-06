# Resgrid to ESO Field Mapping - Updated

## Overview
This document details the current mapping between Resgrid API fields and ESO XML fields. This mapping has been tested with live data and is actively used in the XML generation process. The document has been updated to reflect the latest field mapping requirements including patient information fields and unit time mapping.

## XML Format
- XML files are named as `incident_{CallId}.xml`
- XML namespace is specified as `xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance"`
- A fixed GUID "b394de98-a5b7-408d-a1f2-020eddff92b9" is used for all incidents

## Field Mappings

### Core Incident Information
| ESO XML Field | Resgrid Source | Notes |
|---------------|----------------|-------|
| IncidentNumber | CallId | Unique identifier for the incident |
| IncidentOrOnset | LoggedOn or LoggedOnUtc | Timestamp when the incident was created |
| DispatchNotified | LoggedOn or LoggedOnUtc | Same as IncidentOrOnset |
| ComplaintReportedByDispatch | Type | Type of emergency (e.g., "Medical Emergency") |
| CallNature | Name | Short name/title of the incident |
| CallNatureDescription | Nature + Note | Combined with space-hyphen-space format (e.g., "Description - Note") |
| CadDispatchText | Nature | Detailed description from Resgrid |

### Location Information
| ESO XML Field | Resgrid Source | Notes |
|---------------|----------------|-------|
| IncidentAddress1 | Address | Full address of the incident |
| IncidentCity | Parsed from Address | Usually the second part after comma |
| IncidentState | Parsed from Address | Usually first part of third segment |
| IncidentZip | Parsed from Address | Usually second part of third segment |
| SceneGpsLocationLat | Geolocation (first part) | Latitude coordinate |
| SceneGpsLocationLong | Geolocation (second part) | Longitude coordinate |

### Patient Information
| ESO XML Field | Resgrid Source | Notes |
|---------------|----------------|-------|
| PatientFirstName | ContactName (first part) | First name extracted from ContactName |
| PatientLastName | ContactName (remaining parts) | Last name extracted from ContactName |
| PatientPhone | ContactInfo | Phone number of the patient or reporting party |
| PatientDOB | ExternalId | Date of birth from ExternalId field |

### Unit Information
| ESO XML Field | Resgrid Source | Notes |
|---------------|----------------|-------|
| EmsUnitCallSign | Dispatches[].Name where Type="Unit" | Identifier for the responding unit |
| UnitNotifiedByDispatch | Dispatches[].Name where Type="Unit" | Same as EmsUnitCallSign |
| UnitEnRoute | Dispatches[].EnRouteTime or EnRouteTime | Time when unit began traveling to the scene |
| UnitArrivedOnScene | Dispatches[].ArrivedTime or ArrivedTime | Time when unit arrived at the scene |
| UnitAtPatient | Dispatches[].AtPatientTime or AtPatientTime | Time when unit reached the patient |
| UnitCleared | Dispatches[].ClearedTime or ClearedTime | Time when unit completed the call |

### Response Information
| ESO XML Field | Resgrid Source | Notes |
|---------------|----------------|-------|
| ResponseModeToScene | Mapped from Priority | Mapped as follows:<br>1560 → 390 (Emergent/Lights & Sirens)<br>1559 → 395 (Non-emergent/No Lights & Sirens)<br>Default → 390 |

## API Communication
| Functionality | Endpoint | Notes |
|---------------|----------|-------|
| Authentication | Connect/token | OAuth2 token-based authentication |
| Active Call List | Calls/GetActiveCalls | Retrieves current active calls |
| Call Details | Calls/GetCallExtraData | Retrieves detailed information for a specific call |
| Live Events | SignalR EventingHub | WebSocket connection for real-time call notifications |

## Data Extraction Process
1. Connect to Resgrid SignalR hub to listen for CallAdded events
2. When a new call is received, fetch additional data using Calls/GetCallExtraData endpoint
3. Parse and process all fields according to the mapping specification
4. Generate XML document with proper formatting
5. Upload XML file to ESO via SFTP

## Special Handling Notes
- The VehicleDispatchLocation field has been removed from the XML output per updated requirements
- Patient information is now included in the XML output when available
- Unit times are properly extracted from multiple possible source fields
- A space-hyphen-space format is used to combine Nature and Note fields
- Contact information is parsed to extract patient first/last name