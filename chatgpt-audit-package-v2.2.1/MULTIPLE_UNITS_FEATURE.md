# Multiple Units XML Support - Version 1.6.0

## Overview

The XML generator now automatically supports multiple units per incident using a nested Units structure when multiple units are involved in a call.

## How It Works

### Single Unit Calls
For calls with only one unit, the system maintains the original flat XML structure for backward compatibility:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>198872</IncidentNumber>
  <IncidentOrOnset>2025-05-10T01:10:55.457</IncidentOrOnset>
  <EmsUnitCallSign>STN1</EmsUnitCallSign>
  <UnitEnRoute>2025-05-10T02:21:27.85</UnitEnRoute>
  <UnitArrivedOnScene>2025-05-10T02:24:11.493</UnitArrivedOnScene>
  <!-- other fields -->
</CadIncident>
```

### Multiple Unit Calls
For calls with multiple units, the system automatically switches to a nested Units structure:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>198872</IncidentNumber>
  <IncidentOrOnset>2025-05-10T01:10:55.457</IncidentOrOnset>
  <IncidentAddress1>5846 Painted Pony Cir</IncidentAddress1>
  <IncidentCity>Simi Valley</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>93063</IncidentZip>
  <CadDispatchText>nature of the call</CadDispatchText>
  <CallNature>ANOTHER TEST</CallNature>
  <CallNatureDescription>nature of the call - Additional notes</CallNatureDescription>
  <SceneGpsLocationLat>34.19723919812224</SceneGpsLocationLat>
  <SceneGpsLocationLong>-118.4624331406047</SceneGpsLocationLong>
  <Units>
    <Unit>
      <EmsUnitCallSign>STN1</EmsUnitCallSign>
      <ResponseModeToScene>395</ResponseModeToScene>
      <UnitNotifiedByDispatch>2025-05-10T01:10:55.457</UnitNotifiedByDispatch>
      <UnitEnRoute>2025-05-10T02:21:27.85</UnitEnRoute>
      <UnitArrivedOnScene>2025-05-10T02:24:11.493</UnitArrivedOnScene>
      <UnitAtPatient></UnitAtPatient>
      <UnitCleared></UnitCleared>
      <UnitBackInService></UnitBackInService>
      <PatientFirstName></PatientFirstName>
      <PatientLastName></PatientLastName>
      <PatientDOB></PatientDOB>
    </Unit>
    <Unit>
      <EmsUnitCallSign>BLS11</EmsUnitCallSign>
      <ResponseModeToScene>395</ResponseModeToScene>
      <UnitNotifiedByDispatch>2025-05-10T01:10:55.457</UnitNotifiedByDispatch>
      <UnitEnRoute>2025-05-10T02:21:27.85</UnitEnRoute>
      <UnitArrivedOnScene>2025-05-10T02:24:11.493</UnitArrivedOnScene>
      <UnitAtPatient></UnitAtPatient>
      <UnitCleared></UnitCleared>
      <UnitBackInService></UnitBackInService>
      <PatientFirstName></PatientFirstName>
      <PatientLastName></PatientLastName>
      <PatientDOB></PatientDOB>
    </Unit>
  </Units>
</CadIncident>
```

## Key Features

### Automatic Detection
- The system automatically detects when multiple units are involved in a call
- No configuration needed - it switches formats automatically
- Backward compatibility maintained for single-unit calls

### Individual Unit Timestamps
- Each unit gets its own timestamps:
  - `UnitNotifiedByDispatch`
  - `UnitEnRoute`
  - `UnitArrivedOnScene`
  - `UnitAtPatient`
  - `UnitCleared`
  - `UnitBackInService`

### Data Sources
The system extracts unit information from multiple sources:
1. **Dispatches Array**: Primary source for unit names and basic info
2. **Activity Array**: Source for individual unit status changes and timestamps
3. **Call Data**: Fallback for missing timestamps

### Patient Information
- Patient information is included in each Unit element when applicable
- Patient detection logic (`"I am the patient"`) applies to all units
- Patient DOB formatting maintained (YYYY-MM-DD)

## Database Integration

### Google Sheets Logging
- Multiple units are logged with comma-separated unit names in the existing format
- XML field contains the appropriate structure (nested or flat) based on unit count
- Status tracking continues to work for all units

### SFTP Upload
- Each call generates one XML file regardless of unit count
- ESO CAD system receives complete incident information with all units
- File naming convention remains unchanged

## Implementation Details

### Detection Logic
```javascript
const useNestedUnits = units.length > 1;
```

### Unit Processing
- Units extracted from `extraGetData.Data.Dispatches` array
- Individual timestamps gathered from `extraGetData.Data.Activity` array
- Each unit gets its own object with complete timestamp information

### Fallback Handling
- If no units found in primary source, system falls back to backward compatibility mode
- Empty unit fields handled gracefully
- Missing timestamps left empty rather than using placeholder values

## Testing

The feature includes comprehensive testing:
- Multiple unit scenario validation
- Single unit backward compatibility
- XML structure verification
- Unit name and timestamp accuracy

Run tests with:
```bash
node test-multiple-units-xml.js
```

## Version History

- **v1.6.0**: Added automatic multiple units support with nested XML structure
- **v1.5.0**: XML consistency fixes and GPS coordinate extraction
- **v1.4.9**: Google Sheets integration improvements