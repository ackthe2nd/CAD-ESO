/**
 * Script to verify and fix the XML generator bug
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');

function generateFixedXML() {
  // Simple test data
  const data = {
    guid: "b394de98-a5b7-408d-a1f2-020eddff92b9",
    callId: "TEST123",
    address: "123 Test St, Test City, CA 12345",
    city: "Test City",
    state: "CA",
    zip: "12345",
  };
  
  console.log("Generating XML with standard xmlbuilder2 pattern...");
  
  // Create XML with standard pattern (ele->txt->up)
  const docStandard = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('CadIncident', { 'xmlns_xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
      .ele('Guid').txt(data.guid).up()
      .ele('IncidentNumber').txt(data.callId).up()
      .ele('IncidentAddress1').txt(data.address).up()
      .ele('IncidentCity').txt(data.city).up()
      .ele('IncidentState').txt(data.state).up()
      .ele('IncidentZip').txt(data.zip).up();
  
  const xmlStandard = docStandard.end({ prettyPrint: true });
  
  // Save to file
  const standardPath = path.join(__dirname, 'logs', 'standard_pattern.xml');
  fs.writeFileSync(standardPath, xmlStandard);
  console.log(`Standard pattern XML saved to: ${standardPath}`);
  console.log("\nXML content (standard pattern):");
  console.log(xmlStandard);
  
  // Try alternative pattern
  console.log("\nGenerating XML with alternative element creation pattern...");
  
  // Create XML with alternative pattern
  const docAlt = create({ version: '1.0', encoding: 'UTF-8' });
  const root = docAlt.ele('CadIncident', { 'xmlns_xsi': 'http://www.w3.org/2001/XMLSchema-instance' });
  
  // Add elements explicitly one by one
  root.ele('Guid').txt(data.guid);
  root.ele('IncidentNumber').txt(data.callId);
  root.ele('IncidentAddress1').txt(data.address);
  root.ele('IncidentCity').txt(data.city);
  root.ele('IncidentState').txt(data.state);
  root.ele('IncidentZip').txt(data.zip);
  
  const xmlAlt = docAlt.end({ prettyPrint: true });
  
  // Save to file
  const altPath = path.join(__dirname, 'logs', 'alternative_pattern.xml');
  fs.writeFileSync(altPath, xmlAlt);
  console.log(`Alternative pattern XML saved to: ${altPath}`);
  console.log("\nXML content (alternative pattern):");
  console.log(xmlAlt);
}

// Run the test
generateFixedXML();