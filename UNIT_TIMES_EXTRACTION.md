# Unit Times Extraction in Resgrid-ESO Bridge

This document explains in detail how the Resgrid-ESO Bridge extracts and processes unit timestamps from Resgrid call data.

## Overview

The Resgrid-ESO Bridge needs to extract several key timestamps related to unit activities to populate the ESO XML format:

- **En Route Time**: When the unit began traveling to the scene
- **Arrived Time**: When the unit arrived at the scene
- **At Patient Time**: When the unit made contact with the patient (Committed status)
- **Back in Service Time**: When the unit became available again after the call

These timestamps are extracted from the `Activity` array in the Resgrid call data, which contains status changes for units.

## Timestamp Extraction Logic

### En Route Time (`UnitEnRoute`)

The en route time is extracted from the first activity entry that matches a StatusId of 5:

```javascript
// Find en route time (StatusId = 5)
const enRouteActivity = callData.Activity.find(a => a.StatusId === 5);
if (enRouteActivity) {
  unitEnRouteTime = enRouteActivity.Timestamp;
}
```

### Arrived Time (`UnitArrivedOnScene`)

The arrived time is extracted from the first activity entry that matches a StatusId of 6:

```javascript
// Find arrived time (StatusId = 6)
const arrivedActivity = callData.Activity.find(a => a.StatusId === 6);
if (arrivedActivity) {
  unitArrivedTime = arrivedActivity.Timestamp;
}
```

### At Patient Time (`UnitAtPatient`)

The at patient time is extracted from the first activity entry that matches a StatusId of 3 (Committed):

```javascript
// Find at patient/committed time (StatusId = 3)
const atPatientActivity = callData.Activity.find(a => a.StatusId === 3);
if (atPatientActivity) {
  unitAtPatientTime = atPatientActivity.Timestamp;
}
```

### Back in Service Time (`UnitBackInService`)

The back in service time extraction uses a multi-strategy approach with prioritization:

1. **First Priority**: Look for "returning" keyword in activity text
2. **Second Priority**: Look for other availability keywords
3. **Third Priority**: Look for StatusId = 2
4. **Fallback**: Use the unit cleared time if available

```javascript
// Strategy 1: Find "returning" keyword in activity text
let backInServiceActivity = callData.Activity.find(a => 
  a.Text && a.Text.toLowerCase().includes('returning'));

// Strategy 2: If not found, look for other availability keywords
if (!backInServiceActivity) {
  backInServiceActivity = callData.Activity.find(a => 
    a.Text && (
      a.Text.toLowerCase().includes('available') ||
      a.Text.toLowerCase().includes('cleared') ||
      a.Text.toLowerCase().includes('in service')
    ));
}

// Strategy 3: If still not found, try StatusId = 2 (typically Available)
if (!backInServiceActivity) {
  backInServiceActivity = callData.Activity.find(a => a.StatusId === 2);
}

// Extract timestamp if any strategy succeeded
if (backInServiceActivity) {
  unitBackInServiceTime = backInServiceActivity.Timestamp;
}

// Strategy 4 (Fallback): Use UnitCleared time
if (!unitBackInServiceTime && callData.UnitClearedTime) {
  unitBackInServiceTime = callData.UnitClearedTime;
}
```

## Unit Dispatch Filtering

Before extracting timestamps, the application filters the dispatched units:

```javascript
// Filter dispatches to only include valid units
const validDispatches = callData.Dispatches.filter(d => 
  d.Type === 'Unit' && /^[a-zA-Z0-9]{1,9}$/.test(d.Name)
);
```

This ensures that:
1. Only dispatches with Type="Unit" are included
2. Only units with alphanumeric names ≤ 9 characters are included

## Activity Processing

The activity processing includes checks to ensure that timestamps correspond to the relevant units:

```javascript
// Only include activities for dispatched units
const relevantActivities = callData.Activity.filter(activity => 
  validDispatches.some(dispatch => dispatch.Name === activity.Name)
);
```

This ensures that we only extract timestamps for units that were actually dispatched to the call.

## Example Extraction

Let's look at an example with real data:

### Sample Activity Array

```javascript
Activity: [
  {
    Id: "78122",
    Timestamp: "2025-05-06T10:45:16.843Z",
    Type: "Unit",
    Name: "STN1",
    StatusId: 5, // En route
    StatusText: "En Route",
    StatusColor: "#ffa500"
  },
  {
    Id: "78123",
    Timestamp: "2025-05-06T10:52:34.123Z",
    Type: "Unit",
    Name: "STN1",
    StatusId: 6, // On scene
    StatusText: "On Scene",
    StatusColor: "#ff0000"
  },
  {
    Id: "78124",
    Timestamp: "2025-05-06T10:58:12.789Z",
    Type: "Unit",
    Name: "STN1",
    StatusId: 3, // Committed (at patient)
    StatusText: "Committed",
    StatusColor: "#800080"
  },
  {
    Id: "78125",
    Timestamp: "2025-05-06T11:15:22.456Z",
    Type: "Unit",
    Name: "STN1",
    StatusId: 9, // Returning
    StatusText: "Returning to Station",
    StatusColor: "#008000"
  }
]
```

### Extraction Results

Using the extraction logic on this sample data would produce:

```
UnitEnRoute = 2025-05-06T10:45:16.843Z  (from activity with StatusId=5)
UnitArrivedOnScene = 2025-05-06T10:52:34.123Z  (from activity with StatusId=6)
UnitAtPatient = 2025-05-06T10:58:12.789Z  (from activity with StatusId=3)
UnitBackInService = 2025-05-06T11:15:22.456Z (from activity with StatusId=9)
```

## Special Cases

### Multiple Units

When multiple units are dispatched, the application extracts timestamps based on the first unit to reach each status:

- En route time = Time the first unit went en route
- Arrived time = Time the first unit arrived
- At Patient time = Time the first unit committed to patient
- Back in service time = Time the last unit returned to service

### Missing Activity Data

If activity data is missing or incomplete:

1. Missing en route time: Field is left blank in XML
2. Missing arrived time: Field is left blank in XML
3. Missing at patient time: Falls back to arrived time (On Scene) if available
4. Missing back in service time: Field is left blank in XML or uses fallback

### Timestamp Validation

All timestamps are validated before inclusion in the XML:

1. Must be valid ISO-8601 date strings
2. Must be in chronological order (when possible)
3. Must belong to a relevant dispatched unit

## Implementation in Code

The extraction logic is implemented in the `src/xml-generator.js` file. Here's a simplified version of the timestamp extraction function:

```javascript
function extractUnitTimes(callData) {
  const times = {
    enRoute: null,
    arrived: null,
    atPatient: null,
    backInService: null
  };
  
  if (!callData.Activity || !Array.isArray(callData.Activity)) {
    return times;
  }
  
  // Filter valid dispatches
  const validDispatches = callData.Dispatches.filter(d => 
    d.Type === 'Unit' && /^[a-zA-Z0-9]{1,9}$/.test(d.Name)
  );
  
  // Get unit names
  const unitNames = validDispatches.map(d => d.Name);
  
  // Filter activities for dispatched units
  const relevantActivities = callData.Activity.filter(a => 
    unitNames.includes(a.Name)
  );
  
  // Extract en route time (StatusId = 5)
  const enRouteActivity = relevantActivities.find(a => a.StatusId === 5);
  if (enRouteActivity) {
    times.enRoute = enRouteActivity.Timestamp;
  }
  
  // Extract arrived time (StatusId = 6)
  const arrivedActivity = relevantActivities.find(a => a.StatusId === 6);
  if (arrivedActivity) {
    times.arrived = arrivedActivity.Timestamp;
  }
  
  // Extract at patient/committed time (StatusId = 3)
  const atPatientActivity = relevantActivities.find(a => a.StatusId === 3);
  if (atPatientActivity) {
    times.atPatient = atPatientActivity.Timestamp;
  } else if (arrivedActivity) {
    // If committed status not found, fallback to using the on scene time
    times.atPatient = arrivedActivity.Timestamp;
  }
  
  // Extract back in service time using multi-strategy approach
  // Strategy 1: Find activity with StatusId = 9 (Returning)
  let backInServiceActivity = relevantActivities.find(a => a.StatusId === 9);
  
  // Strategy 2: If not found, look for StatusId = 2 (Available)
  if (!backInServiceActivity) {
    backInServiceActivity = relevantActivities.find(a => a.StatusId === 2);
  }
  
  // Strategy 3: If still not found, try StatusId = 8 (Cleared)
  if (!backInServiceActivity) {
    backInServiceActivity = relevantActivities.find(a => a.StatusId === 8);
  }
  
  // Extract timestamp if any strategy succeeded
  if (backInServiceActivity) {
    times.backInService = backInServiceActivity.Timestamp;
  } else if (callData.ClosedOn) {
    // Fallback to call closed time
    times.backInService = callData.ClosedOn;
  }
  
  return times;
}
```

## Future Enhancements

Potential future enhancements to the timestamp extraction logic include:

1. **Multiple Unit Handling**: Support for mapping individual unit timestamps rather than just the first/last
2. **Time Range Validation**: Add more sophisticated validation to ensure timestamps are within reasonable ranges
3. **Custom Status Mapping**: Allow configuration of which status IDs map to which timestamps
4. **Detailed Logging**: Enhanced logging of the extraction process for better troubleshooting