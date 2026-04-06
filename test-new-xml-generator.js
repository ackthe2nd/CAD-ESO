/**
 * Test script to verify our fixed XML generator
 */
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator');

// Run the test
function main() {
  console.log('Testing new XML generator with call data from call 198424...');
  
  // Try to load the call data from file
  const callDataPath = path.join(__dirname, 'logs', 'call_198424_GetCall.json');
  const extraDataPath = path.join(__dirname, 'logs', 'call_198424_GetCallExtraData.json');
  
  // Check if the files exist
  if (!fs.existsSync(callDataPath) || !fs.existsSync(extraDataPath)) {
    console.error(`Error: Could not find call data files`);
    return;
  }
  
  // Load the call data
  const callData = JSON.parse(fs.readFileSync(callDataPath, 'utf8'));
  const extraData = JSON.parse(fs.readFileSync(extraDataPath, 'utf8'));
  
  // Combine the data as they would be in real usage
  const combinedData = {
    GetCall: callData,
    GetCallExtraData: extraData
  };
  
  // Generate the XML using our new generator
  const xmlOutput = generateXML(combinedData);
  
  // Save the XML to a file for review
  const outputPath = path.join(__dirname, 'logs', 'call_198424_new_generator.xml');
  fs.writeFileSync(outputPath, xmlOutput);
  
  console.log(`XML generated and saved to: ${outputPath}`);
  console.log('\nXML content:');
  console.log(xmlOutput);
  
  console.log('\nXML structure validation:');
  if (xmlOutput.includes('</IncidentAddress1>>') || 
      xmlOutput.includes('</VehicleDispatchLocation>>') ||
      xmlOutput.includes('</SceneGpsLocationLat>>') || 
      xmlOutput.includes('</SceneGpsLocationLong>>')) {
    console.log('❌ FAILED: XML contains formatting issues');
  } else {
    console.log('✅ PASSED: XML format is valid');
  }
}

// Run the main function
main();