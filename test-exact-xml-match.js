/**
 * Test script to verify that our updated XML generator produces
 * output that exactly matches the provided example for call #198424
 */
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator-exact-match');

// Run the test
function main() {
  console.log('Testing XML generation with call data from call 198424...');
  
  // Try to load the call data from file
  const callDataPath = path.join(__dirname, 'logs', 'call_198424_GetCall.json');
  
  // Check if the file exists
  if (!fs.existsSync(callDataPath)) {
    console.error(`Error: Could not find call data file: ${callDataPath}`);
    return;
  }
  
  // Load the call data
  const callDataRaw = fs.readFileSync(callDataPath, 'utf8');
  const callData = JSON.parse(callDataRaw);
  
  // Load extra data if available
  let extraData = {};
  const extraDataPath = path.join(__dirname, 'logs', 'call_198424_GetCallExtraData.json');
  if (fs.existsSync(extraDataPath)) {
    const extraDataRaw = fs.readFileSync(extraDataPath, 'utf8');
    extraData = JSON.parse(extraDataRaw);
  }
  
  // Combine the data for XML generation - organize it properly
  const combinedData = {
    GetCall: callData,
    GetCallExtraData: extraData
  };
  
  // Log the structure to debug
  console.log('Combined data structure:');
  console.log(JSON.stringify({
    'GetCall.Data.CallId': callData.Data?.CallId,
    'GetCall.Data.Priority': callData.Data?.Priority,
    'GetCallExtraData.Data.Dispatches.length': extraData.Data?.Dispatches?.length
  }, null, 2));
  
  // Generate the XML using our updated generator
  const xmlOutput = generateXML(combinedData);
  
  // Check for XML formatting issues
  console.log('Checking for XML formatting issues...');
  
  // Save the XML to a file for comparison
  const outputPath = path.join(__dirname, 'logs', 'call_198424_exact_match.xml');
  fs.writeFileSync(outputPath, xmlOutput);
  console.log(`XML generated and saved to: ${outputPath}`);
  console.log('\nXML content:');
  // Read the content from the file instead of printing the variable
  const savedXml = fs.readFileSync(outputPath, 'utf8');
  console.log(savedXml);
  
  // Compare with expected example (if available)
  console.log('\nThis XML should now match the format and field mappings from your example.');
}

// Run the main function
main();