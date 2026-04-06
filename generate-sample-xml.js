/**
 * Generate a sample XML file based on our field mapping specification
 * This will create a realistic example of what the XML output would look like
 */
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');
const { mapPriorityToEsoCode } = require('./src/utils/priority');

// Sample call data
const sampleCall = {
  CallId: '12345',
  LoggedOn: '2025-05-06T08:45:30.000Z',
  Name: 'Medical Emergency - Difficulty Breathing',
  Nature: 'Difficulty Breathing',
  FullAddress: '123 Main Street, Springfield, IL 62701',
  Address: '123 Main Street, Springfield, IL 62701',
  Note: 'Elderly patient with shortness of breath. History of COPD.',
  Notes: 'Patient reports worsening symptoms over past 24 hours.',
  
  // Priority (will be mapped to ResponseModeToScene)
  Priority: {
    Id: '1560',
    Name: 'High'
  },
  
  // Address components
  AddressLine1: '123 Main Street',
  AddressLine2: 'Apt 4B',
  City: 'Springfield',
  County: 'Sangamon',
  State: 'IL',
  ZipCode: '62701',
  
  // Destination information
  DestinationName: 'Springfield Memorial Hospital',
  
  // Location information
  Latitude: '39.78325',
  Longitude: '-89.65631',
  CrossStreet: 'Main St & Oak Ave',
  MapPage: 'G7',
  
  // Caller information
  ReportingParty: 'Jane Smith (daughter)',
  ReportingPartyPhone: '555-123-4567',
  
  // Call status
  CallState: 'Active',
  
  // Driver information 
  Driver: 'John Doe',
  
  // Timestamps
  TransferPatientTime: '2025-05-06T09:45:30.000Z',
  DispatchClosedTime: '2025-05-06T10:15:30.000Z',
  UnitNotifiedTime: '2025-05-06T08:48:30.000Z',
  UnitEnRouteTime: '2025-05-06T08:51:30.000Z',
  UnitArrivedTime: '2025-05-06T09:05:30.000Z',
  
  // Dispatches - will be filtered for units with 4-5 digit IDs
  Dispatches: [
    {
      Type: 'Unit',
      Name: '12345',
      ID: 'U-12345'
    },
    {
      Type: 'Unit',
      Name: '54321',
      ID: 'U-54321'
    },
    {
      Type: 'Personnel',
      Name: 'John Smith',
      ID: 'P-001'
    }
  ]
};

// Process the data for XML generation
function prepareCallDataForXml(callData) {
  // Filter dispatches to get unit call signs
  const unitCallSigns = callData.Dispatches
    .filter(d => d.Type === 'Unit' && /^\d{4,5}$/.test(d.Name))
    .map(d => d.Name);
  
  const unitsCsv = unitCallSigns.join(',');
  
  // Map priority to response mode
  const responseModeToScene = mapPriorityToEsoCode(callData.Priority.Id);
  
  // Prepare the complete data for XML generation
  return {
    CallId: callData.CallId,
    Timestamp: callData.LoggedOn,
    Nature: callData.Name || callData.Nature,
    Address: callData.FullAddress || callData.Address,
    UnitsCsv: unitsCsv,
    Notes: callData.Note || callData.Notes,
    
    // Address components
    IncidentAddress1: callData.AddressLine1,
    IncidentAddress2: callData.AddressLine2,
    City: callData.City,
    County: callData.County,
    State: callData.State,
    Zip: callData.ZipCode,
    DestinationName: callData.DestinationName,
    
    // ESO mapped fields
    Priority: callData.Priority.Name,
    RunNumber: callData.CallId,
    ResponseModeToScene: responseModeToScene,
    
    // Additional location information
    GeoLocation: `${callData.Latitude},${callData.Longitude}`,
    CrossStreet: callData.CrossStreet,
    MapPage: callData.MapPage,
    
    // Caller information
    ReportingParty: callData.ReportingParty,
    ReportingPhone: callData.ReportingPartyPhone,
    
    // Call status
    CallStatus: callData.CallState,
    
    // Driver information
    Driver: callData.Driver,
    
    // Timestamps
    TransferOfPatientTime: callData.TransferPatientTime,
    DispatchClosedTime: callData.DispatchClosedTime,
    UnitNotifiedTime: callData.UnitNotifiedTime,
    UnitEnRouteTime: callData.UnitEnRouteTime,
    UnitArrivedTime: callData.UnitArrivedTime
  };
}

// Generate XML from call data
function generateXML(callData) {
  // Create the XML document
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
      .ele('IncidentNumber').txt(callData.CallId).up()
      .ele('IncidentOrOnset').txt(callData.Timestamp).up();
  
  // Add units (EmsUnitCallSign)
  if (callData.UnitsCsv) {
    doc.ele('EmsUnitCallSign').txt(callData.UnitsCsv).up();
  }
  
  // Add complaint (ComplaintReportedByDispatch)
  if (callData.Nature) {
    doc.ele('ComplaintReportedByDispatch').txt(callData.Nature).up();
  }
  
  // Add dispatch location (VehicleDispatchLocation)
  if (callData.Address) {
    doc.ele('VehicleDispatchLocation').txt(callData.Address).up();
  }
  
  // Add dispatch notes (CadDispatchText)
  if (callData.Notes) {
    doc.ele('CadDispatchText').txt(callData.Notes).up();
  }
  
  // Add priority-based fields
  if (callData.ResponseModeToScene) {
    doc.ele('ResponseModeToScene').txt(callData.ResponseModeToScene).up();
  }
  
  if (callData.Priority) {
    doc.ele('EMD_Performed').txt(callData.Priority).up();
  }
  
  // Add address components
  if (callData.IncidentAddress1) {
    doc.ele('IncidentAddress1').txt(callData.IncidentAddress1).up();
  }
  
  if (callData.IncidentAddress2) {
    doc.ele('IncidentAddress2').txt(callData.IncidentAddress2).up();
  }
  
  // City, County, State, Zip
  if (callData.City) {
    doc.ele('IncidentCity').txt(callData.City).up();
  }
  
  if (callData.County) {
    doc.ele('IncidentCounty').txt(callData.County).up();
  }
  
  if (callData.State) {
    doc.ele('IncidentState').txt(callData.State).up();
  }
  
  if (callData.Zip) {
    doc.ele('IncidentZip').txt(callData.Zip).up();
  }
  
  // Destination
  if (callData.DestinationName) {
    doc.ele('DestinationName').txt(callData.DestinationName).up();
  }
  
  // Additional location information
  if (callData.GeoLocation) {
    doc.ele('GeoLocation').txt(callData.GeoLocation).up();
  }
  
  if (callData.CrossStreet) {
    doc.ele('CrossStreet').txt(callData.CrossStreet).up();
  }
  
  if (callData.MapPage) {
    doc.ele('MapPage').txt(callData.MapPage).up();
  }
  
  // Caller information
  if (callData.ReportingParty) {
    doc.ele('ReportingParty').txt(callData.ReportingParty).up();
  }
  
  if (callData.ReportingPhone) {
    doc.ele('ContactPhone').txt(callData.ReportingPhone).up();
  }
  
  // Call status
  if (callData.CallStatus) {
    doc.ele('CAD_VehicleDisposition').txt(callData.CallStatus).up();
  }
  
  if (callData.Driver) {
    doc.ele('Driver').txt(callData.Driver).up();
  }
  
  if (callData.RunNumber) {
    doc.ele('RunNumber').txt(callData.RunNumber).up();
  }
  
  // Timestamps
  if (callData.TransferOfPatientTime) {
    doc.ele('TransferOfPatientTimeOnScene').txt(callData.TransferOfPatientTime).up();
  }
  
  if (callData.DispatchClosedTime) {
    doc.ele('CAD_ClosedTime').txt(callData.DispatchClosedTime).up();
  }
  
  if (callData.UnitNotifiedTime) {
    doc.ele('CAD_UnitNotifiedTime').txt(callData.UnitNotifiedTime).up();
  }
  
  if (callData.UnitEnRouteTime) {
    doc.ele('CAD_EnrouteTime').txt(callData.UnitEnRouteTime).up();
  }
  
  if (callData.UnitArrivedTime) {
    doc.ele('CAD_ArrivedTime').txt(callData.UnitArrivedTime).up();
  }
  
  // Return the XML as a string
  return doc.end({ prettyPrint: true });
}

// Main function to generate and save the sample XML
function main() {
  console.log('Generating sample XML based on field mapping...');
  
  // Process the sample call data
  const processedData = prepareCallDataForXml(sampleCall);
  
  // Generate XML
  const xmlData = generateXML(processedData);
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Save to file
  const filename = 'sample_call_data.xml';
  const filePath = path.join(logsDir, filename);
  fs.writeFileSync(filePath, xmlData);
  
  console.log(`Sample XML file generated: ${filePath}`);
  console.log('\nXML Content:');
  console.log(xmlData);
}

// Run the main function
main();