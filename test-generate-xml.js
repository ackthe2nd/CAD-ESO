/**
 * Test script to generate a comprehensive XML example based on real call data
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Create sample call data using the structure we observed from the API
const sampleCallData = {
  CallId: "198513",
  Name: "PERSON DOWN",
  Priority: {
    Id: 1560,
    Name: "Emergent",
    Color: "#ff0000"
  },
  Type: "Medical Emergency",
  Address: "11401 Chalon Rd, Los Angeles, CA 90049, USA",
  LoggedOn: "2025-05-05T20:43:21.000Z",
  ContactName: "Ryan Albaugh",
  ContactInfo: "(111) 111-1111",
  ExternalId: "01-01-2000", // Used as DOB
  Description: "EVENT: Other - - INCIDENT TYPE: MEDICAL EMERGENCY - LOCATION: Front - ALERTS: NOT BREATHING? (YES) - NOT CONSCIOUS? (YES) - DETAILS: This is the description for the test -  HAS 911 BEEN CONTACTED?: (NO) - COMPLAINANT: Ryan Albaugh - (111) 111-1111  - I am the patient",
  Note: "Submitted by EMS Incident Dispatch Form",
  
  // Address components
  AddressLine1: "11401 Chalon Rd",
  City: "Los Angeles",
  State: "CA",
  Zip: "90049",
  
  // Activity with status changes
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
      Timestamp: "2025-05-06T11:15:22.456Z",
      Type: "Unit",
      Name: "STN1",
      StatusId: 0,
      StatusText: "Returning to Station",
      StatusColor: "#008000"
    }
  ],
  
  // Dispatched units
  Dispatches: [
    {
      Id: "F1457F34-94B7-402A-964A-7FE4BCC198F7",
      Type: "User",
      Name: "Alec Buckner",
      GroupId: "4169",
      Group: "LA County"
    },
    {
      Id: "A2B3C4D5-E6F7-8901-2345-6789ABCDEF01",
      Type: "Unit",
      Name: "STN1",
      GroupId: "4169",
      Group: "LA County"
    },
    {
      Id: "B2C3D4E5-F6A7-8901-2345-6789ABCDEF02",
      Type: "Unit",
      Name: "AMB2",
      GroupId: "4169",
      Group: "LA County"
    }
  ],
  
  // Derived fields
  UnitsCsv: "STN1, AMB2"
};

// Generate XML using string templates (the most reliable approach)
function generateXML(callData) {
  // Find unit timestamps
  let unitEnRouteTime = '';
  let unitArrivedTime = '';
  let unitBackInServiceTime = '';
  
  if (callData.Activity && Array.isArray(callData.Activity)) {
    // Find en route time (StatusId = 5)
    const enRouteActivity = callData.Activity.find(a => a.StatusId === 5);
    if (enRouteActivity) {
      unitEnRouteTime = enRouteActivity.Timestamp;
    }
    
    // Find arrived time (StatusId = 6)
    const arrivedActivity = callData.Activity.find(a => a.StatusId === 6);
    if (arrivedActivity) {
      unitArrivedTime = arrivedActivity.Timestamp;
    }
    
    // Find returning time (contains "returning" in StatusText)
    const returningActivity = callData.Activity.find(a => 
      a.StatusText && a.StatusText.toLowerCase().includes('returning'));
    if (returningActivity) {
      unitBackInServiceTime = returningActivity.Timestamp;
    }
  }
  
  // Determine response mode based on priority ID
  let responseModeToScene = '390'; // Default (Emergent/Lights & Sirens)
  if (callData.Priority && callData.Priority.Id === 1559) {
    responseModeToScene = '395'; // Non-emergent/No Lights & Sirens
  }
  
  // XML template
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>5F4A88C2-A18D-49E0-8A92-EF8764D2A483</Guid>
  <IncidentNumber>${callData.CallId}</IncidentNumber>
  <IncidentOrOnset>${callData.LoggedOn}</IncidentOrOnset>
  <ComplaintReportedByDispatch>${callData.Type || callData.Name}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>${callData.Address}</VehicleDispatchLocation>
  <EmsUnitCallSign>${callData.UnitsCsv}</EmsUnitCallSign>
  <CadDispatchText>${callData.Description}</CadDispatchText>
  <ResponseModeToScene>${responseModeToScene}</ResponseModeToScene>
  <IncidentAddress1>${callData.AddressLine1}</IncidentAddress1>
  <IncidentCity>${callData.City}</IncidentCity>
  <IncidentState>${callData.State}</IncidentState>
  <IncidentZip>${callData.Zip}</IncidentZip>
  <CallNature>${callData.Name}</CallNature>
  <CallNatureDescription>${callData.Description}</CallNatureDescription>
  <ReportingParty>${callData.ContactName}</ReportingParty>
  <ContactPhone>${callData.ContactInfo}</ContactPhone>
  <PatientFirstName>${callData.ContactName ? callData.ContactName.split(' ')[0] : ''}</PatientFirstName>
  <PatientLastName>${callData.ContactName ? callData.ContactName.split(' ').slice(1).join(' ') : ''}</PatientLastName>
  <PatientDOB>${callData.ExternalId || ''}</PatientDOB>
  <CAD_UnitNotifiedTime>${callData.LoggedOn}</CAD_UnitNotifiedTime>
  <CAD_EnrouteTime>${unitEnRouteTime}</CAD_EnrouteTime>
  <CAD_ArrivedTime>${unitArrivedTime}</CAD_ArrivedTime>
  <UnitBackInService>${unitBackInServiceTime}</UnitBackInService>
  <EMD_Performed>${callData.Priority ? callData.Priority.Name : ''}</EMD_Performed>
</CadIncident>`;

  return xml;
}

// Log data to Google Sheets (pretend version)
function logToGoogleSheets(callData) {
  // This would normally connect to Google Sheets
  // Here we'll just log the column headers and data
  console.log('\nGoogle Sheets - Call Data Sheet');
  console.log('Headers: Timestamp, Call ID, Nature, Priority, Address, Units, Status');
  
  const timestamp = new Date().toISOString();
  const callId = callData.CallId;
  const nature = callData.Name;
  const priority = callData.Priority ? callData.Priority.Name : '';
  const address = callData.Address;
  const units = callData.UnitsCsv;
  const status = 'Active';
  
  console.log(`Data Row: ${timestamp}, ${callId}, ${nature}, ${priority}, ${address}, ${units}, ${status}`);
  
  console.log('\nGoogle Sheets - Logs Sheet');
  console.log('Headers: Timestamp, Level, Message');
  console.log(`Data Row: ${timestamp}, info, Processed call ${callId}`);
  
  return {
    callData: [timestamp, callId, nature, priority, address, units, status],
    logs: [timestamp, 'info', `Processed call ${callId}`]
  };
}

// Main function
function main() {
  console.log('Generating sample XML based on call data...');
  
  // Generate the XML
  const xml = generateXML(sampleCallData);
  
  // Save the XML to a file
  const outputDir = path.join(__dirname, 'test-output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputPath = path.join(outputDir, 'sample-call.xml');
  fs.writeFileSync(outputPath, xml);
  
  console.log(`XML saved to ${outputPath}`);
  console.log('\nGenerated XML:');
  console.log(xml);
  
  // Simulate Google Sheets logging
  const sheetsData = logToGoogleSheets(sampleCallData);
  
  console.log('\nTest completed successfully!');
}

// Run the main function
main();