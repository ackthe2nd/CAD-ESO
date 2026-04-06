/**
 * Generate XML file that matches the exact format provided in the example
 */
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');
const { v4: uuidv4 } = require('uuid');

// Sample call data matching the example
const sampleCall = {
  CallId: '198424',
  Guid: 'b394de98-a5b7-408d-a1f2-020eddff92b9', // Using the example GUID
  LoggedOn: '2025-05-04T15:40:29.397',
  Name: 'Medical Emergency',
  FullAddress: '14051 Califa St, Sherman Oaks, CA 91401, USA\n',
  Note: '- INCIDENT TYPE: Medical Emergency - LOCATION: 14051 Califa St, Sherman Oaks, CA 91401, USA\n (Front Yard) - ALERTS: NOT BREATHING? (NO) - NOT CONSCIOUS? (NO) - DETAILS: ADDITIONAL DETAILS - COMPLAINANT: FIRSTNAME LASTNAME (111) 111-1111  I am the Patient - HAS 911 BEEN CONTACTED?:  - Submitted via EMIDF',
  
  // Priority value
  Priority: {
    Id: '1560',
    Name: 'High'
  },
  
  // Unit information
  UnitNotifiedByDispatch: 'STN1',
  
  // Call nature details
  CallNature: 'TEST - Form Submit',
  CallNatureDescription: '- INCIDENT TYPE: Medical Emergency - LOCATION: 14051 Califa St, Sherman Oaks, CA 91401, USA\n (Front Yard) - ALERTS: NOT BREATHING? (NO) - NOT CONSCIOUS? (NO) - DETAILS: ADDITIONAL DETAILS - COMPLAINANT: FIRSTNAME LASTNAME (111) 111-1111  I am the Patient - HAS 911 BEEN CONTACTED?:  - Submitted via EMIDF - Submitted by EMS Incident Dispatch Form',
  
  // GPS coordinates
  Latitude: '34.17768',
  Longitude: '-118.43952',
  
  // Dispatches - will be filtered for units with 4-5 digit IDs
  Dispatches: [
    {
      Type: 'Unit',
      Name: 'STN1',
      ID: 'U-STN1'
    }
  ]
};

// Generate XML that exactly matches the example format
function generateExactFormatXML(callData) {
  // FIX: Use template strings to ensure proper XML formatting
  return `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>${callData.Guid}</Guid>
  <IncidentNumber>${callData.CallId}</IncidentNumber>
  <IncidentOrOnset>${callData.LoggedOn}</IncidentOrOnset>
  <DispatchNotified>${callData.LoggedOn}</DispatchNotified>
  <ComplaintReportedByDispatch>${callData.Name}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>${callData.FullAddress}</VehicleDispatchLocation>
  <IncidentAddress1>${callData.FullAddress}</IncidentAddress1>
  <IncidentCity></IncidentCity>
  <IncidentState></IncidentState>
  <IncidentZip></IncidentZip>
  <CadDispatchText>${callData.Note}</CadDispatchText>
  <EmsUnitCallSign>${callData.UnitNotifiedByDispatch}</EmsUnitCallSign>
  <UnitNotifiedByDispatch>${callData.UnitNotifiedByDispatch}</UnitNotifiedByDispatch>
  <Priority>${callData.Priority.Id}</Priority>
  <ResponseModeToScene>${callData.Priority.Id}</ResponseModeToScene>
  <CallNature>${callData.CallNature}</CallNature>
  <CallNatureDescription>${callData.CallNatureDescription}</CallNatureDescription>
  <UnitEnRoute></UnitEnRoute>
  <UnitArrivedOnScene></UnitArrivedOnScene>
  <UnitAtPatient></UnitAtPatient>
  <UnitCleared></UnitCleared>
  <SceneGpsLocationLat>${callData.Latitude}</SceneGpsLocationLat>
  <SceneGpsLocationLong>${callData.Longitude}</SceneGpsLocationLong>
</CadIncident>`;
}

// Main function to generate and save the sample XML
function main() {
  console.log('Generating XML with exact format from example...');
  
  // Generate XML
  const xmlData = generateExactFormatXML(sampleCall);
  
  // Ensure logs directory exists
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  // Save to file
  const filename = 'exact_format_call_data.xml';
  const filePath = path.join(logsDir, filename);
  fs.writeFileSync(filePath, xmlData);
  
  console.log(`XML file generated: ${filePath}`);
  console.log('\nXML Content:');
  console.log(xmlData);
}

// Run the main function
main();