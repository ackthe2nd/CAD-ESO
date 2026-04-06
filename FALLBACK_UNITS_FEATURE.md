# Fallback Unit Assignment Feature

## Overview
The ResgridESOBridge now automatically assigns all available emergency units to calls when no specific units are found in the call data, ensuring every emergency receives appropriate response coverage.

## Implementation
When processing emergency calls, if no units are assigned through normal dispatch channels, the system automatically assigns all available units:

- EVTMED1, EVTMED2 (Event Medical Units)
- SETMED1, SETMED2 (Setup Medical Units)  
- STN1, STN2, STN3 (Station Units)
- ERT1, ERT2 (Emergency Response Teams)
- CART1 (Cardiac Response Team)
- BIKE1 (Bike Response Unit)
- CMD1 (Command Unit)
- SPT1 (Support Unit)

## Logging and Monitoring
The system provides clear indication when fallback assignment occurs:

```
[WARN] No units assigned to call 201080 - fallback units assigned: EVTMED1, EVTMED2, SETMED1, SETMED2, STN1, STN2, STN3, ERT1, ERT2, CART1, BIKE1, CMD1, SPT1
```

Additional logging to Google Sheets includes:
- Status: "Fallback Units: [unit list]"
- Warning level entry for audit tracking
- XML generation metadata

## XML Generation
Fallback units are included in the XML with proper ESO formatting:
- Multiple units create nested `<Units><Unit>` structure
- Each unit receives proper timestamps and response codes
- Maintains compatibility with ESO processing requirements

## Benefits
- Ensures no emergency call lacks responding units
- Provides comprehensive response coverage for unassigned calls
- Maintains audit trail of fallback assignments
- Preserves normal unit assignment when available

## Testing
Comprehensive test suite verifies:
- Fallback activation only when no units assigned
- All fallback units included in XML output
- Correct XML structure generation
- Proper logging of fallback usage
- Normal assignment preservation when units present

Date: June 7, 2025
Status: Active and Deployed