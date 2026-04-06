# Resgrid Integration Reference

## Overview

The Resgrid-ESO Bridge connects to the Resgrid emergency services platform to receive real-time call data and transform it into ESO-compatible XML format. This document provides reference information about the Resgrid system that this bridge integrates with.

## Resgrid Core Repository

The core Resgrid functionality is maintained in a separate repository:
https://github.com/ackthe2nd/core

This repository contains the core functionality of the Resgrid system, which serves as the source of the data our bridge processes.

## Key Integration Points

1. **SignalR Connection**:
   - The bridge connects to the Resgrid SignalR hub at `events.resgrid.com/eventingHub`
   - This enables real-time reception of events like `CallAdded`

2. **API Endpoints**:
   - Base URL: `https://api.resgrid.com/api/v4/`
   - Authentication: `/Connect/token` endpoint with grant_type=password
   - Call Data: `/Calls/GetCall` and `/Calls/GetCallExtraData` 
   - Active Calls: `/Calls/GetActiveCalls`
   - Unit Status: `/UnitStatus/GetUnitStatus` and `/Units/GetAllUnitsInfos`

3. **Data Structures**:
   - Unit data is found in `Data.Dispatches` with `Type='Unit'`
   - GPS coordinates can be found in unit activity data's `Location` field
   - Call timestamps are available in both call data and unit activity records

## Development Considerations

When making changes to the Resgrid-ESO Bridge, consider the following:

1. **Data Structure Changes**:
   - The Resgrid core system may undergo updates that change data structures
   - Our bridge implements fallbacks for backward compatibility in data access patterns
   - Always check for nested data in both direct properties and within `Data` objects

2. **Unit Status Codes**:
   - Status ID mappings: 2=Available, 3=Committed/At Patient, 5=En Route, 6=On Scene, etc.
   - These status codes are used to extract timestamps for events like unit arrival

3. **Field Mapping Logic**:
   - Our XML generator maps fields from Resgrid format to ESO format
   - Reference the `xml-generator.js` file for the complete mapping logic
   - Field names and structures in the Resgrid core should be monitored for changes

## Testing Against Resgrid

When testing changes to the bridge, ensure:

1. The bridge can authenticate with Resgrid API credentials
2. The SignalR connection can be established and events are received
3. API endpoints return expected data structures
4. The bridge can properly extract unit names, status changes, and GPS coordinates
5. The generated XML includes all required fields in the correct format

## Additional Resources

For more information about the Resgrid API and system architecture, refer to the documentation in the core repository and the additional materials in this deployment package.