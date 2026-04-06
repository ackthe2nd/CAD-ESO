// This script demonstrates what the XML output from the app looks like
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');

/**
 * Generates XML for ESO from call data (similar to src/xml-generator.js)
 */
function generateXML(callData) {
  try {
    console.log(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Create XML document
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt('b394de98-a5b7-408d-a1f2-020eddff92b9').up()
        .ele('IncidentNumber').txt(callData.CallId).up()
        .ele('IncidentOrOnset').txt(callData.Timestamp || new Date().toISOString()).up()
        .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up()
        .ele('VehicleDispatchLocation').txt(callData.Address || '').up()
        .ele('EmsUnitCallSign').txt(callData.UnitsCsv || '').up()
        .ele('CadDispatchText').txt(callData.Notes || '').up()
      .doc();
    
    return doc.end({ prettyPrint: true });
  } catch (error) {
    console.error(`Error generating XML: ${error.message}`);
    throw error;
  }
}

// Create a sample call that looks like a real Resgrid call
const sampleCall = {
  CallId: '23451', // This would be a real call ID from Resgrid
  Timestamp: new Date().toISOString(),
  Nature: 'MEDICAL EMERGENCY - CHEST PAIN',
  Address: '123 Main Street, Anytown, TX 75001',
  UnitsCsv: 'Engine 1, Medic 2, Battalion 3',
  Notes: 'Patient is a 65 year old male experiencing chest pain and shortness of breath. Patient has history of cardiac issues. BP 150/90, HR 95, SpO2 92%.'
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