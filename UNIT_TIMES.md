# Unit Timestamp Extraction and Mapping

This document details how we extract unit status timestamps from Resgrid data and map them to the appropriate fields in the ESO XML format.

## Timestamp Fields

The application extracts and maps the following unit status timestamps:

| ESO XML Field | Description | Source in Resgrid Data |
|---------------|-------------|------------------------|
| UnitEnRoute | When the unit started traveling to the incident | Activity StatusId 5 |
| UnitArrivedOnScene | When the unit arrived at the incident location | Activity StatusId 6 |
| UnitAtPatient | When the unit reached the patient | AtPatientTime field (various sources) |
| UnitCleared | When the unit cleared from the call | ClearedTime field (various sources) |
| UnitBackInService | When the unit returned to available status | Multiple sources (see below) |

## UnitBackInService Time Extraction

For the "back in service" timestamp, the application uses multiple detection strategies, in the following order of priority:

1. **Keyword-based Status Detection**:
   - Searches for unit activities with status text containing keywords like:
     - "returning" (highest priority)
     - "available"
     - "cleared"
     - "in service"
     - "in quarter"
     - "complete"
   - If found, uses the timestamp from the matching activity entry

2. **Status ID Detection**:
   - Looks for unit activities with StatusId = 2
   - StatusId 2 commonly corresponds to "Available" in Resgrid systems

3. **Fallback to UnitCleared**:
   - If no specific "back in service" time is found but UnitCleared time exists
   - Uses the UnitCleared time as the back in service time

4. **Direct Field Mapping**:
   - Checks for explicit fields like:
     - `UnitBackInServiceTime`
     - `BackInServiceTime`

## Technical Implementation

Within the Activity array returned by the Resgrid API, entries have the following structure that we use for extraction:

```json
{
  "Activity": [
    {
      "Type": "Unit",
      "Name": "UnitName",
      "Timestamp": "2025-05-06T10:45:16.843",
      "StatusId": 5,
      "StatusText": "En Route"
    },
    {
      "Type": "Unit",
      "Name": "UnitName",
      "Timestamp": "2025-05-06T10:48:58.847",
      "StatusId": 6,
      "StatusText": "On Scene"
    },
    {
      "Type": "Unit",
      "Name": "UnitName",
      "Timestamp": "2025-05-06T11:23:45.123",
      "StatusId": 2,
      "StatusText": "Available"
    }
  ]
}
```

The XML generator uses the following code pattern to extract these timestamps:

```javascript
// Extract en route time (StatusId 5)
const enRouteActivity = activities.find(a => a.StatusId === 5);
if (enRouteActivity && enRouteActivity.Timestamp) {
  unitEnRouteTime = enRouteActivity.Timestamp;
}

// Extract on scene time (StatusId 6)
const onSceneActivity = activities.find(a => a.StatusId === 6);
if (onSceneActivity && onSceneActivity.Timestamp) {
  unitArrivedOnSceneTime = onSceneActivity.Timestamp;
}

// Extract back in service time using multiple strategies
// Strategy 1: Keyword matching
const backInServiceKeywords = ['available', 'cleared', 'in service', 'in quarter', 'complete', 'returning'];
const backInServiceByKeyword = activities.find(a => 
  a.StatusText && backInServiceKeywords.some(keyword => 
    a.StatusText.toLowerCase().includes(keyword)
  )
);

// Strategy 2: StatusId 2 (often "Available")
const availableActivity = activities.find(a => a.StatusId === 2);

// Apply strategies in priority order
if (backInServiceByKeyword && backInServiceByKeyword.Timestamp) {
  unitBackInServiceTime = backInServiceByKeyword.Timestamp;
} else if (availableActivity && availableActivity.Timestamp) {
  unitBackInServiceTime = availableActivity.Timestamp;
}

// Fallback to UnitCleared if no other time found
if (!unitBackInServiceTime && unitClearedTime) {
  unitBackInServiceTime = unitClearedTime;
}
```

## XML Output Format

The extracted unit timestamps are included in the ESO XML format as follows:

```xml
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <!-- Other fields -->
  <UnitEnRoute>2025-05-06T10:45:16.843</UnitEnRoute>
  <UnitArrivedOnScene>2025-05-06T10:48:58.847</UnitArrivedOnScene>
  <UnitAtPatient></UnitAtPatient>
  <UnitCleared>2025-05-06T11:20:12.456</UnitCleared>
  <UnitBackInService>2025-05-06T11:23:45.123</UnitBackInService>
  <!-- Other fields -->
</CadIncident>
```