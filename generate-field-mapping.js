const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Field mapping data organized by categories
const fieldMapping = [
  // Category: Core Incident Information
  {
    category: "Core Incident Information",
    mappings: [
      { resgridField: "CallId", esoField: "IncidentNumber", notes: "Primary identifier for the incident" },
      { resgridField: "Name or Nature", esoField: "ComplaintReportedByDispatch", notes: "Call name or nature description" },
      { resgridField: "Address", esoField: "VehicleDispatchLocation", notes: "Full address string" },
      { resgridField: "LoggedOn or LoggedOnUtc", esoField: "IncidentOrOnset", notes: "When the incident was created" },
      { resgridField: "Note or Notes", esoField: "CadDispatchText", notes: "Incident description/notes" },
      { resgridField: "Priority (number or name)", esoField: "EMD_Performed", notes: "Mapped to 'Low', 'Medium', 'High' when possible" },
      { resgridField: "Priority.Id=1560", esoField: "ResponseModeToScene=390", notes: "Maps Resgrid priority ID to ESO response mode" },
      { resgridField: "Priority.Id=1559", esoField: "ResponseModeToScene=395", notes: "Maps Resgrid priority ID to ESO response mode" },
      { resgridField: "Number", esoField: "DispatchCode", notes: "Call number/code" },
      { resgridField: "State", esoField: "CAD_VehicleDisposition", notes: "Call status" },
      { resgridField: "Type", esoField: "IncidentType", notes: "Type of incident" }
    ]
  },
  
  // Category: Address Components
  {
    category: "Address Components",
    mappings: [
      { resgridField: "Street part of Address", esoField: "IncidentAddress1", notes: "First line of parsed address" },
      { resgridField: "Additional address info", esoField: "IncidentAddress2", notes: "Second line or cross street info" },
      { resgridField: "City part of Address", esoField: "DestinationCity", notes: "City extracted from address" },
      { resgridField: "County from Address", esoField: "DestinationCounty", notes: "County information" },
      { resgridField: "State part of Address", esoField: "DestinationState", notes: "State code (e.g., TX)" },
      { resgridField: "Zip part of Address", esoField: "DestinationZip", notes: "Postal/Zip code" },
      { resgridField: "What3Words", esoField: "LocationReference", notes: "What3Words location reference" },
      { resgridField: "Geolocation", esoField: "GeoLocation", notes: "Geographic coordinates" },
      { resgridField: "Latitude + Longitude", esoField: "GeoLocation", notes: "Combined as 'lat,long' format" },
      { resgridField: "Cross street info", esoField: "CrossStreet", notes: "Cross street information" }
    ]
  },
  
  // Category: Contact Information
  {
    category: "Contact Information",
    mappings: [
      { resgridField: "ContactName or ReportingParty", esoField: "ReportingParty", notes: "Person who reported the incident" },
      { resgridField: "ContactInfo or ReportingPartyPhone", esoField: "ContactPhone", notes: "Phone number of reporting party" }
    ]
  },
  
  // Category: Times and Timestamps
  {
    category: "Times and Timestamps",
    mappings: [
      { resgridField: "DispatchedOn or DispatchedOnUtc", esoField: "CAD_UnitNotifiedTime", notes: "When units were notified" },
      { resgridField: "EnRouteOn from dispatches", esoField: "CAD_EnrouteTime", notes: "When units began traveling to scene" },
      { resgridField: "ArrivedOn from dispatches", esoField: "CAD_ArrivedTime", notes: "When units arrived on scene" },
      { resgridField: "PatientContactOn or estimated", esoField: "TransferOfPatientTimeOnScene", notes: "When patient contact was made" },
      { resgridField: "ClosedOn or CompletedOn", esoField: "CAD_ClosedTime", notes: "When incident was completed" }
    ]
  },
  
  // Category: Unit Information
  {
    category: "Unit Information",
    mappings: [
      { resgridField: "Dispatches (Unit type)", esoField: "EmsUnitCallSign", notes: "CSV list of dispatched units" },
      { resgridField: "PrimaryUnit or Driver", esoField: "Driver", notes: "Primary unit or designated driver" }
    ]
  },
  
  // Category: Reference and External IDs
  {
    category: "Reference and External IDs",
    mappings: [
      { resgridField: "ReferenceId", esoField: "ReferenceNumber", notes: "Reference ID" },
      { resgridField: "ExternalId", esoField: "ExternalIncidentID", notes: "External system ID" },
      { resgridField: "IncidentId", esoField: "IncidentID", notes: "Internal incident ID" },
      { resgridField: "CallId (alternate use)", esoField: "RunNumber", notes: "Used as run number if not otherwise specified" }
    ]
  },
  
  // Category: Protocol Information
  {
    category: "Protocol Information",
    mappings: [
      { resgridField: "Protocols[].Name", esoField: "Used in ProtocolText", notes: "Protocol names combined" },
      { resgridField: "Protocols[].Code", esoField: "DispatchCode", notes: "Protocol codes combined" },
      { resgridField: "Protocols[].Description", esoField: "Used in ProtocolText", notes: "Protocol descriptions" },
      { resgridField: "Protocols[].ProtocolText", esoField: "Used in ProtocolText", notes: "Full protocol text" }
    ]
  },
  
  // Category: Patient Information (from form data)
  {
    category: "Patient Information (from form data)",
    mappings: [
      { resgridField: "Patient ID fields", esoField: "PatientSSN", notes: "Patient ID or SSN" },
      { resgridField: "Patient first name fields", esoField: "PatientFirstName", notes: "Patient's first name" },
      { resgridField: "Patient last name fields", esoField: "PatientLastName", notes: "Patient's last name" },
      { resgridField: "Patient middle initial fields", esoField: "PatientMiddleInitial", notes: "Patient's middle initial" },
      { resgridField: "Patient DOB fields", esoField: "PatientDOB", notes: "Patient's date of birth" },
      { resgridField: "Patient age fields", esoField: "PatientAge", notes: "Patient's age" },
      { resgridField: "Patient gender fields", esoField: "PatientGender", notes: "Patient's gender" },
      { resgridField: "Patient address fields", esoField: "PatientAddress", notes: "Patient's address" }
    ]
  },
  
  // Category: Activity and Dispatch Logs
  {
    category: "Activity and Dispatch Logs",
    mappings: [
      { resgridField: "Activity[]", esoField: "Appended to CadDispatchText", notes: "Activity log entries with timestamps" },
      { resgridField: "Dispatches[]", esoField: "Appended to CadDispatchText", notes: "Dispatch log entries with timestamps" },
      { resgridField: "CallFormData", esoField: "Various patient fields", notes: "Parsed for additional patient details" }
    ]
  },
  
  // Category: Destination Information
  {
    category: "Destination Information",
    mappings: [
      { resgridField: "Destination", esoField: "DestinationName", notes: "Destination facility name" }
    ]
  }
];

// Create workbook
const workbook = XLSX.utils.book_new();

// Process each category
fieldMapping.forEach(category => {
  // Create worksheet for this category
  const ws_data = [
    ['Resgrid Field', 'ESO Field', 'Notes'], // Headers
    ...category.mappings.map(item => [item.resgridField, item.esoField, item.notes])
  ];
  
  const worksheet = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Auto-size columns
  const colWidths = [];
  ws_data.forEach(row => {
    row.forEach((cell, i) => {
      const cellLength = (cell || '').toString().length;
      colWidths[i] = Math.max(colWidths[i] || 0, cellLength);
    });
  });
  
  // Set column widths
  worksheet['!cols'] = colWidths.map(width => ({ width: Math.min(Math.max(width + 2, 10), 50) }));
  
  // Add the worksheet to the workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, category.category.substring(0, 31)); // Max 31 chars for sheet name
});

// Create a summary sheet with all mappings
const allMappings = fieldMapping.flatMap(category => 
  category.mappings.map(item => [category.category, item.resgridField, item.esoField, item.notes])
);

const summaryData = [
  ['Category', 'Resgrid Field', 'ESO Field', 'Notes'], // Headers
  ...allMappings
];

const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);

// Auto-size columns for summary sheet
const summaryColWidths = [];
summaryData.forEach(row => {
  row.forEach((cell, i) => {
    const cellLength = (cell || '').toString().length;
    summaryColWidths[i] = Math.max(summaryColWidths[i] || 0, cellLength);
  });
});

summarySheet['!cols'] = summaryColWidths.map(width => ({ width: Math.min(Math.max(width + 2, 10), 50) }));

// Add the summary sheet as the first sheet
XLSX.utils.book_append_sheet(workbook, summarySheet, 'All Mappings');

// Write the workbook to a file
const outputPath = path.join(__dirname, 'Resgrid_to_ESO_Field_Mapping.xlsx');
XLSX.writeFile(workbook, outputPath);

console.log(`Excel file created successfully at: ${outputPath}`);