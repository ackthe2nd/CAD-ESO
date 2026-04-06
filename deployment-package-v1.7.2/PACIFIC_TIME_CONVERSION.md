# Pacific Time Conversion Feature - Version 1.7.2

## Overview
All timestamp fields in XML output are now automatically converted to Pacific Time while preserving the original format structure.

## What Changed

### Before Pacific Time Conversion
- Timestamps remained in original timezone (usually UTC)
- Example: `2025-06-07T22:06:49.12` (UTC)

### After Pacific Time Conversion  
- All timestamps converted to Pacific Time (PST/PDT)
- Example: `2025-06-07T15:06:49.12` (Pacific Time)

## Timestamp Fields Converted

### Main Call Timestamps
- `LoggedOn` - When call was logged
- `LoggedOnUtc` - UTC timestamp
- `DispatchedOn` - When units were dispatched
- `DispatchedOnUtc` - UTC dispatch time

### Unit Activity Timestamps
- `UnitNotifiedByDispatch` - When unit was notified
- `UnitEnRoute` - When unit went en route
- `UnitArrivedOnScene` - When unit arrived
- `UnitAtPatient` - When unit reached patient
- `UnitCleared` - When unit cleared scene
- `UnitBackInService` - When unit returned to service

### XML Output Fields
- `IncidentOrOnset` - Incident start time
- `DispatchNotified` - Dispatch notification time
- All nested unit timestamp fields

## Technical Implementation

### Timezone Handling
- Uses `America/Los_Angeles` timezone for Pacific Time
- Automatically handles PST (UTC-8) and PDT (UTC-7) transitions
- Preserves millisecond precision when present

### Format Preservation
- Maintains original format structure exactly
- Preserves `T` separator for ISO format timestamps
- Keeps millisecond decimals when present
- Example conversions:
  - `2025-06-07T22:06:49.12` → `2025-06-07T15:06:49.12`
  - `2025-06-07 22:06:49.833` → `2025-06-07 15:06:49.833`

## Testing Verification

Run the included test to verify conversion:
```bash
node test-pacific-time.js
```

Expected output shows 7-hour difference (PST) or 8-hour difference (PDT):
```
UTC Time: 2025-06-07T22:06:49.12
Pacific Time: 2025-06-07T15:06:49.12
```

## System Impact

### Benefits
- ESO receives all timestamps in local Pacific Time
- Eliminates timezone confusion for emergency response teams
- Maintains consistent time representation across all XML files
- Preserves exact original formatting for compatibility

### Performance
- Minimal processing overhead (microseconds per timestamp)
- No impact on system memory or network usage
- All conversions happen during XML generation

## Monitoring
Look for these log messages confirming Pacific Time conversion:
- `Pacific Time conversion applied to all timestamp fields`
- `Final selected loggedOn (Pacific Time): [timestamp]`

This ensures all emergency call data timestamps accurately reflect Pacific Time for proper coordination with local emergency response operations.