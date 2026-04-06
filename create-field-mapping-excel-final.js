/**
 * Script to generate final Excel file with all field mappings from Resgrid to ESO
 * Updated to reflect current code state after fixes
 */
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

// Define the field mappings based on our specification and implementation
const fieldMappings = [
  // Required fields
  { 
    category: "Required Fields", 
    resgridField: "CallId", 
    esoField: "IncidentNumber", 
    description: "Unique identifier for the incident",
    specSource: "CallId",
    codeSource: "callExtraData.CallId || callData.CallId",
    status: "✓"
  },
  { 
    category: "Required Fields", 
    resgridField: "LoggedOn/LoggedOnUtc/Timestamp", 
    esoField: "IncidentOrOnset", 
    description: "When the incident was logged or occurred",
    specSource: "LoggedOn/LoggedOnUtc/Timestamp",
    codeSource: "callExtraData.LoggedOn || callExtraData.LoggedOnUtc || callData.Timestamp || new Date().toISOString()",
    status: "✓"
  },
  { 
    category: "Required Fields", 
    resgridField: "Name/Nature", 
    esoField: "ComplaintReportedByDispatch", 
    description: "The nature of the incident as reported",
    specSource: "Name (or Nature)",
    codeSource: "callExtraData.Name || callExtraData.Nature || callData.Nature || ''",
    status: "✓"
  },
  { 
    category: "Required Fields", 
    resgridField: "FullAddress/Address", 
    esoField: "VehicleDispatchLocation", 
    description: "The full address of the incident",
    specSource: "FullAddress/Address",
    codeSource: "callExtraData.FullAddress || callData.Address || ''",
    status: "✓"
  },
  { 
    category: "Required Fields", 
    resgridField: "Dispatches[].Name (filtered for Units)", 
    esoField: "EmsUnitCallSign", 
    description: "Comma-separated list of unit call signs",
    specSource: "Dispatches[].Name, filtered to 4-5 digit IDs",
    codeSource: "callExtraData.Dispatches.filter(d => d.Type === 'Unit' && /^\\d{4,5}$/.test(d.Name)).map(d => d.Name)",
    status: "✓"
  },
  { 
    category: "Required Fields", 
    resgridField: "Notes/Note", 
    esoField: "CadDispatchText", 
    description: "Notes about the incident",
    specSource: "Note",
    codeSource: "callExtraData.Note || callExtraData.Notes || callData.Notes || ''",
    status: "✓"
  },
  
  // Priority Mapping
  { 
    category: "Priority Mapping", 
    resgridField: "Priority.Id = 1560", 
    esoField: "ResponseModeToScene = 390", 
    description: "Lights & sirens response",
    specSource: "mapped: 1560→390, 1559→395",
    codeSource: "mapPriorityToEsoCode(callExtraData.Priority.Id)",
    status: "✓ Using centralized mapping utility"
  },
  { 
    category: "Priority Mapping", 
    resgridField: "Priority.Id = 1559", 
    esoField: "ResponseModeToScene = 395", 
    description: "Non-lights & sirens response",
    specSource: "mapped: 1560→390, 1559→395",
    codeSource: "mapPriorityToEsoCode(callExtraData.Priority.Id)",
    status: "✓ Using centralized mapping utility"
  },
  { 
    category: "Priority Mapping", 
    resgridField: "Priority.Id = any other value", 
    esoField: "ResponseModeToScene = 390", 
    description: "Default to lights & sirens",
    specSource: "mapped: other→390 (default)",
    codeSource: "DEFAULT_RESPONSE_MODE (390)",
    status: "✓"
  },
  { 
    category: "Priority Mapping", 
    resgridField: "Priority.Name", 
    esoField: "EMD_Performed", 
    description: "Priority name used as EMD_Performed value",
    specSource: "Priority.Name",
    codeSource: "callData.Priority || (callExtraData.Priority ? callExtraData.Priority.Name : '') || ''",
    status: "✓"
  },
  
  // Address and Location Fields
  { 
    category: "Address Fields", 
    resgridField: "AddressLine1", 
    esoField: "IncidentAddress1", 
    description: "First line of the address",
    specSource: "AddressLine1",
    codeSource: "callExtraData.AddressLine1 || callData.Address || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "AddressLine2", 
    esoField: "IncidentAddress2", 
    description: "Second line of the address",
    specSource: "AddressLine2",
    codeSource: "callExtraData.AddressLine2 || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "City", 
    esoField: "IncidentCity", 
    description: "City of the incident",
    specSource: "City",
    codeSource: "callExtraData.City || parsed from callData.Address || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "County", 
    esoField: "IncidentCounty", 
    description: "County of the incident",
    specSource: "County",
    codeSource: "callExtraData.County || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "State", 
    esoField: "IncidentState", 
    description: "State of the incident",
    specSource: "State",
    codeSource: "callExtraData.State || parsed from callData.Address || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "ZipCode/Zip", 
    esoField: "IncidentZip", 
    description: "ZIP code of the incident",
    specSource: "ZipCode/Zip",
    codeSource: "callExtraData.ZipCode || callExtraData.Zip || parsed from callData.Address || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "DestinationName", 
    esoField: "DestinationName", 
    description: "Name of the destination facility",
    specSource: "DestinationName",
    codeSource: "callExtraData.DestinationName || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "Latitude,Longitude", 
    esoField: "GeoLocation", 
    description: "Geographic coordinates of the incident",
    specSource: "Activity scene event coords or call.Geolocation",
    codeSource: "${callExtraData.Latitude || ''},${callExtraData.Longitude || ''}",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "CrossStreet", 
    esoField: "CrossStreet", 
    description: "Cross street information",
    specSource: "CrossStreet",
    codeSource: "callExtraData.CrossStreet || callData.CrossStreet || ''",
    status: "✓"
  },
  { 
    category: "Address Fields", 
    resgridField: "MapPage", 
    esoField: "MapPage", 
    description: "Map page reference",
    specSource: "MapPage",
    codeSource: "callExtraData.MapPage || callData.MapPage || ''",
    status: "✓"
  },
  
  // Caller Information
  { 
    category: "Caller Information", 
    resgridField: "ReportingParty", 
    esoField: "ReportingParty", 
    description: "Person who reported the incident",
    specSource: "ReportingParty",
    codeSource: "callExtraData.ReportingParty || callData.ReportingParty || ''",
    status: "✓"
  },
  { 
    category: "Caller Information", 
    resgridField: "ReportingPartyPhone", 
    esoField: "ContactPhone", 
    description: "Contact phone for the reporting party",
    specSource: "ReportingPartyPhone",
    codeSource: "callExtraData.ReportingPartyPhone || callData.ReportingPhone || ''",
    status: "✓"
  },
  
  // Call Status
  { 
    category: "Call Status", 
    resgridField: "CallState/CallStatus", 
    esoField: "CAD_VehicleDisposition", 
    description: "Current status of the call",
    specSource: "CallState/CallStatus",
    codeSource: "callExtraData.CallState || callData.CallStatus || ''",
    status: "✓"
  },
  { 
    category: "Call Status", 
    resgridField: "Driver", 
    esoField: "Driver", 
    description: "Vehicle driver information",
    specSource: "Driver",
    codeSource: "callExtraData.Driver || callData.Driver || ''",
    status: "✓"
  },
  { 
    category: "Call Status", 
    resgridField: "RunNumber/CallId", 
    esoField: "RunNumber", 
    description: "Run number identifier",
    specSource: "CallId",
    codeSource: "callExtraData.CallId || callData.CallId || ''",
    status: "✓"
  },
  
  // Timestamps
  { 
    category: "Timestamps", 
    resgridField: "TransferPatientTime", 
    esoField: "TransferOfPatientTimeOnScene", 
    description: "When the patient was transferred",
    specSource: "TransferPatientTime",
    codeSource: "callExtraData.TransferPatientTime || callData.TransferOfPatientTime || ''",
    status: "✓"
  },
  { 
    category: "Timestamps", 
    resgridField: "DispatchClosedTime", 
    esoField: "CAD_ClosedTime", 
    description: "When the dispatch was closed",
    specSource: "DispatchClosedTime",
    codeSource: "callExtraData.DispatchClosedTime || callData.DispatchClosedTime || ''",
    status: "✓"
  },
  { 
    category: "Timestamps", 
    resgridField: "UnitNotifiedTime", 
    esoField: "CAD_UnitNotifiedTime", 
    description: "When the unit was notified",
    specSource: "Activity[] with regex matches",
    codeSource: "callExtraData.UnitNotifiedTime || callData.UnitNotifiedTime || ''",
    status: "✓"
  },
  { 
    category: "Timestamps", 
    resgridField: "UnitEnRouteTime", 
    esoField: "CAD_EnrouteTime", 
    description: "When the unit was en route",
    specSource: "Activity[] with regex matches",
    codeSource: "callExtraData.UnitEnRouteTime || callData.UnitEnRouteTime || ''",
    status: "✓"
  },
  { 
    category: "Timestamps", 
    resgridField: "UnitArrivedTime", 
    esoField: "CAD_ArrivedTime", 
    description: "When the unit arrived on scene",
    specSource: "Activity[] with regex matches",
    codeSource: "callExtraData.UnitArrivedTime || callData.UnitArrivedTime || ''",
    status: "✓"
  }
];

// Create a new workbook
const workbook = xlsx.utils.book_new();

// Format the data for the field mappings worksheet
const mappingData = fieldMappings.map(mapping => [
  mapping.category,
  mapping.resgridField,
  mapping.esoField,
  mapping.description,
  mapping.specSource,
  mapping.codeSource,
  mapping.status
]);

// Add header row
mappingData.unshift(['Category', 'Resgrid Field', 'ESO Field', 'Description', 'Spec Source', 'Actual Code Source', 'Status']);

// Create the worksheet for field mappings
const fieldMappingSheet = xlsx.utils.aoa_to_sheet(mappingData);

// Set column widths for better readability
const colWidths = [
  { wch: 15 }, // Category
  { wch: 25 }, // Resgrid Field
  { wch: 25 }, // ESO Field
  { wch: 40 }, // Description
  { wch: 25 }, // Spec Source
  { wch: 45 }, // Actual Code Source
  { wch: 20 }  // Status
];
fieldMappingSheet['!cols'] = colWidths;

// Add the worksheet to the workbook
xlsx.utils.book_append_sheet(workbook, fieldMappingSheet, 'Field Mappings');

// Create a separate sheet for priority mapping
const priorityMappings = [
  ['Resgrid Priority ID', 'ESO ResponseModeToScene', 'Description'],
  ['1560', '390', 'Lights & sirens response'],
  ['1559', '395', 'Non-lights & sirens response'],
  ['Any other or missing value', '390', 'Default to lights & sirens (fallback)']
];

const prioritySheet = xlsx.utils.aoa_to_sheet(priorityMappings);
prioritySheet['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 40 }];
xlsx.utils.book_append_sheet(workbook, prioritySheet, 'Priority Mapping');

// Create a sheet with implementation details
const implementationDetails = [
  ['Component', 'Description'],
  ['src/utils/priority.js', 'Centralized utility for mapping Resgrid Priority IDs to ESO ResponseModeToScene codes'],
  ['src/index.js', 'Main service implementation with XML generation and field mapping'],
  ['src/token-manager.js', 'Manages authentication tokens with automatic refresh on 401 errors'],
  ['src/resgrid-api.js', 'Handles API communication with Resgrid'],
  ['src/logger.js', 'Provides structured logging'],
  ['src/config.js', 'Centralizes configuration with validation']
];

const implementationSheet = xlsx.utils.aoa_to_sheet(implementationDetails);
implementationSheet['!cols'] = [{ wch: 30 }, { wch: 70 }];
xlsx.utils.book_append_sheet(workbook, implementationSheet, 'Implementation');

// Create a sheet with changes made
const changesDetails = [
  ['Component', 'Change Made', 'Description'],
  ['Address Fields', 'Updated XML field names', 'Changed DestinationCity, DestinationCounty, DestinationState, and DestinationZip to IncidentCity, IncidentCounty, IncidentState, and IncidentZip'],
  ['Unit Filtering', 'Fixed pattern matching', 'Changed filter from using d.ID to d.Name for the 4-5 digit numeric check: /^\\d{4,5}$/.test(d.Name)'],
  ['Notes Priority', 'Corrected fallback order', 'Changed from callExtraData.Notes || callExtraData.Note to callExtraData.Note || callExtraData.Notes to prioritize Note over Notes'],
  ['Priority Mapping', 'Verified centralization', 'Confirmed all code paths properly use the mapPriorityToEsoCode() utility function'],
  ['Documentation', 'Created Excel mapping', 'Created comprehensive field mapping documentation for future reference'],
];

const changesSheet = xlsx.utils.aoa_to_sheet(changesDetails);
changesSheet['!cols'] = [{ wch: 20 }, { wch: 30 }, { wch: 70 }];
xlsx.utils.book_append_sheet(workbook, changesSheet, 'Changes Made');

// Write the workbook to a file
const outputFile = 'Resgrid_to_ESO_Field_Mapping_Final.xlsx';
xlsx.writeFile(workbook, outputFile);

console.log(`Final Excel mapping file created: ${outputFile}`);