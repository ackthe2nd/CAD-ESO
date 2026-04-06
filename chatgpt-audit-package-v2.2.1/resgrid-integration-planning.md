# Resgrid API Integration Planning

Test run at: 5/7/2025, 4:09:48 AM

## Working Endpoints (10)

### Get Call by ID
- **URL**: `https://api.resgrid.com/api/v4/Calls/GetCall?callId=198513`
- **Data Type**: object
- **Return Data Structure**: Call object with full call details
- **Description**: Retrieves a specific call by its unique ID. Contains comprehensive information about the call including address, priority, geolocation, etc.

### Get Call Extra Data
- **URL**: `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=198513`
- **Data Type**: object
- **Return Data Structure**: Contains CallFormData, Activity, Dispatches, Priority, Protocols
- **Description**: Gets additional data for a specific call, including unit activities and timestamps. This is crucial for tracking unit status changes during a call.

### Get Unit Status by ID
- **URL**: `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId=8826`
- **Data Type**: object
- **Return Data Structure**: Unit status object with Name, State, StateCss, Timestamp, etc.
- **Description**: Retrieves the current status of a specific unit by its ID. This is the most reliable method to get real-time unit status information.

### Get All Units
- **URL**: `https://api.resgrid.com/api/v4/Units/GetAllUnits`
- **Data Type**: array
- **Return Data Structure**: Array of unit objects with basic information
- **Description**: Gets a list of all units in the department with their current status and basic information.

### Get All Call Types
- **URL**: `https://api.resgrid.com/api/v4/CallTypes/GetAllCallTypes`
- **Data Type**: array
- **Return Data Structure**: Simple array of call type objects with Id and Name
- **Description**: Lists all possible call types configured in the department. Useful for mapping call types to external systems.

### Get All Call Priorities
- **URL**: `https://api.resgrid.com/api/v4/CallPriorities/GetAllCallPriorites`
- **Data Type**: array
- **Return Data Structure**: Array of priority objects with Id, Name, Color, etc.
- **Description**: Lists all possible call priority levels with their display attributes. Important for properly categorizing emergencies.

### Get All Call Protocols
- **URL**: `https://api.resgrid.com/api/v4/CallProtocols/GetAllCallProtocols`
- **Data Type**: array
- **Return Data Structure**: Array of protocol objects with detailed information
- **Description**: Lists all call protocols that provide procedural guidance for different call types.

### Get All Unit Status Definitions
- **URL**: `https://api.resgrid.com/api/v4/Statuses/GetAllUnitStatuses`
- **Data Type**: array
- **Return Data Structure**: Array containing unit status definitions with color and text properties
- **Description**: Provides the complete set of possible unit statuses with their display attributes. Critical for mapping status changes in the system.

### Get All Department Groups
- **URL**: `https://api.resgrid.com/api/v4/Groups/GetAllGroups`
- **Data Type**: array
- **Return Data Structure**: Array of group objects with GroupId, Name, etc.
- **Description**: Lists all organizational groups in the department. Useful for filtering units and personnel by group.

### Get Autofills
- **URL**: `https://api.resgrid.com/api/v4/Autofills/GetAllAutofills`
- **Data Type**: array
- **Return Data Structure**: Array of autofill configuration objects
- **Description**: Lists all configured autofill templates for call creation.

## Integration Planning

Based on the available endpoints, here are the key integration points for connecting Resgrid with other systems:

### 1. Core Integration Components

#### Call Data Access
- **GetActiveCalls**: Retrieve all active calls in the system
- **GetCall**: Get detailed information for a specific call by ID
- Used to monitor new calls and retrieve specific call details

#### Unit Status Tracking
- **GetUnitStatus**: Get current status of a specific unit by ID
- **GetAllUnits**: Get all units with their basic status information
- Used to track unit assignments, status changes, and location updates

#### Call Details and Activity
- **GetCallExtraData**: Get detailed activity logs for a specific call
- Used to monitor unit status changes, timestamps for arrivals/departures, and other call activities

#### Reference Data
- **GetAllCallTypes**: Get call type definitions
- **GetAllCallPriorities**: Get priority level definitions
- **GetAllUnitStatuses**: Get status code definitions
- Used to support field mapping and proper display of status values

### 2. System Architecture Recommendations

#### Real-time Event Monitoring
- Connect to Resgrid's SignalR hub for real-time event notifications
- Process CallAdded events to capture new calls immediately
- Monitor UnitStatusChanged events to track unit status in real-time

#### Data Synchronization Strategy
- Fetch active calls at regular intervals as a backup for missed events
- Use GetCallExtraData to get complete activity history when processing calls
- Cache reference data (call types, priorities, statuses) to reduce API calls

#### Status Mapping Approach
- Use GetAllUnitStatuses to build a complete status mapping table
- Map Resgrid status codes to external system states with the following key mappings:
  - StatusId 5 = En Route / Responding
  - StatusId 6 = On Scene
  - StatusId 3 = Committed / At Patient
  - StatusId 8 = Returning
  - StatusId 0 = Available

### 3. Best Practices for API Usage

#### Authentication Management
- Implement token caching with automatic refresh before expiration
- Store credentials securely as environment variables
- Add refresh margin of 15+ minutes to prevent token expiration during operations

#### Error Handling
- Implement automatic retry for network failures with exponential backoff
- Add fallback endpoints for critical operations
- Handle API rate limits with appropriate throttling

#### Call Processing
- Use full URLs (including base URL) for all API requests
- Always check for the .Data property in responses
- Verify the presence of unit data in both Activity and Dispatches arrays

### 4. Future Enhancement Opportunities

#### Unit Location Tracking
- Units have Latitude and Longitude properties that can be mapped
- Potentially useful for mapping integrations or ETA calculations

#### Protocols Information
- Call protocols could be used to provide procedural guidance to other systems
- Protocol text can be extracted and displayed in related systems

#### Department Groups
- Group information could be used for filtering or routing notifications
- Units and personnel can be categorized by group
