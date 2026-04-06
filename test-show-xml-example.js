// This script demonstrates what the XML output from the app looks like
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');

/**
 * Generates XML for ESO from call data (similar to src/xml-generator.js)
 * Following ESO's field mapping documentation
 */
function generateXML(callData) {
  try {
    console.log(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Create base XML document with required fields
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt('b394de98-a5b7-408d-a1f2-020eddff92b9').up()
        .ele('IncidentNumber').txt(callData.CallId).up()
        .ele('IncidentOrOnset').txt(callData.Timestamp || new Date().toISOString()).up()
        .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up()
        .ele('VehicleDispatchLocation').txt(callData.Address || '').up()
        .ele('EmsUnitCallSign').txt(callData.UnitsCsv || '').up()
        .ele('CadDispatchText').txt(callData.Notes || '').up();
    
    // Detailed address fields
    if (callData.IncidentAddress1) {
      doc.ele('IncidentAddress1').txt(callData.IncidentAddress1).up();
    }
    
    if (callData.IncidentAddress2) {
      doc.ele('IncidentAddress2').txt(callData.IncidentAddress2).up();
    }
    
    // Location fields based on ESO mapping
    if (callData.City) {
      doc.ele('DestinationCity').txt(callData.City).up();
    }
    
    if (callData.County) {
      doc.ele('DestinationCounty').txt(callData.County).up();
    }
    
    if (callData.State) {
      doc.ele('DestinationState').txt(callData.State).up();
    }
    
    if (callData.Zip) {
      doc.ele('DestinationZip').txt(callData.Zip).up();
    }
    
    // Destination name if available
    if (callData.DestinationName) {
      doc.ele('DestinationName').txt(callData.DestinationName).up();
    }
    
    // EMD_Performed tag has been removed as requested
    
    // Address and location data
    if (callData.GeoLocation) {
      doc.ele('GeoLocation').txt(callData.GeoLocation).up();
    }
    
    if (callData.CrossStreet) {
      doc.ele('CrossStreet').txt(callData.CrossStreet).up();
    }
    
    // Caller information
    if (callData.ReportingParty) {
      doc.ele('ReportingParty').txt(callData.ReportingParty).up();
    }
    
    if (callData.ReportingPhone) {
      doc.ele('ContactPhone').txt(callData.ReportingPhone).up();
    }
    
    // Additional identifiers
    if (callData.MapPage) {
      doc.ele('MapPage').txt(callData.MapPage).up();
    }
    
    if (callData.RunNumber) {
      doc.ele('RunNumber').txt(callData.RunNumber).up();
    }
    
    // Status information - map to CAD_VehicleDisposition per ESO specs
    if (callData.CallStatus) {
      doc.ele('CAD_VehicleDisposition').txt(callData.CallStatus).up();
    }
    
    // Driver information from ESO field mapping
    if (callData.Driver) {
      doc.ele('Driver').txt(callData.Driver).up();
    }
    
    // Timestamps according to ESO specifications
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
    
    return doc.end({ prettyPrint: true });
  } catch (error) {
    console.error(`Error generating XML: ${error.message}`);
    throw error;
  }
}

// Create a sample call that looks like a real Resgrid call with all ESO fields mapped correctly
const sampleCall = {
  // Required fields
  CallId: '23451', // This would be a real call ID from Resgrid - Maps to IncidentNumber
  Timestamp: new Date().toISOString(), // Maps to IncidentOrOnset
  Nature: 'MEDICAL EMERGENCY - CHEST PAIN', // Maps to ComplaintReportedByDispatch
  Address: '123 Main Street, Anytown, TX 75001', // Maps to VehicleDispatchLocation
  UnitsCsv: 'Engine 1, Medic 2, Battalion 3', // Maps to EmsUnitCallSign
  Notes: 'Patient is a 65 year old male experiencing chest pain and shortness of breath. Patient has history of cardiac issues. BP 150/90, HR 95, SpO2 92%.', // Maps to CadDispatchText
  
  // Detailed address fields
  IncidentAddress1: '123 Main Street', // Maps to IncidentAddress1
  IncidentAddress2: 'Suite 100', // Maps to IncidentAddress2
  
  // Location fields directly mapped to ESO fields
  City: 'Anytown', // Maps to DestinationCity
  County: 'Smith County', // Maps to DestinationCounty
  State: 'TX', // Maps to DestinationState
  Zip: '75001', // Maps to DestinationZip
  DestinationName: 'Memorial Hospital', // Maps to DestinationName
  
  // ESO-specific fields
  Priority: 'High', // Maps to EMD_Performed
  RunNumber: '43122', // Maps to RunNumber in ESO
  Driver: 'John Doe', // Maps to Driver
  
  // Additional location information
  GeoLocation: '33.1234,-96.6789', // Maps to GeoLocation
  CrossStreet: 'Oak Avenue & Pine Street', // Maps to CrossStreet
  MapPage: 'Page 23, Grid C5', // Maps to MapPage
  
  // Reporting party information
  ReportingParty: 'John Smith (Neighbor)', // Maps to ReportingParty
  ReportingPhone: '555-123-4567', // Maps to ContactPhone
  
  // Status information
  CallStatus: 'Active', // Maps to CAD_VehicleDisposition
  
  // Timestamps - all in ISO format
  TransferOfPatientTime: new Date(Date.now() + 3600000).toISOString(), // Maps to TransferOfPatientTimeOnScene
  DispatchClosedTime: new Date(Date.now() + 7200000).toISOString(), // Maps to CAD_ClosedTime
  UnitNotifiedTime: new Date(Date.now() - 1800000).toISOString(), // Maps to CAD_UnitNotifiedTime
  UnitEnRouteTime: new Date(Date.now() - 1200000).toISOString(), // Maps to CAD_EnrouteTime
  UnitArrivedTime: new Date(Date.now() - 600000).toISOString() // Maps to CAD_ArrivedTime
};

// Generate the XML
const xmlOutput = generateXML(sampleCall);

// Display the XML
console.log('\n--------- EXAMPLE XML OUTPUT ---------\n');
console.log(xmlOutput);
console.log('\n--------------------------------------\n');

// Save to a file for reference
const filePath = './example-output.xml';
fs.writeFileSync(filePath, xmlOutput);
console.log(`Example XML also saved to: ${filePath}`);

console.log('\nThis is what the XML will look like when sent to ESO SFTP server.');
console.log('When a real call comes in from Resgrid, the service will:');
console.log('1. Receive the call data via SignalR');
console.log('2. Fetch additional details from Resgrid API');
console.log('3. Generate an XML file similar to this example');
console.log('4. Upload the XML file to the ESO SFTP server');
console.log('\nThe service is currently running and waiting for calls.');