/**
 * Test script to verify Priority ID to ResponseModeToScene mapping
 */
const fs = require('fs');
const path = require('path');
const tempDir = '/tmp/resgrid-eso-test';
const { mapPriorityToEsoCode, DEFAULT_RESPONSE_MODE } = require('./src/utils/priority');
const { create } = require('xmlbuilder2');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Simple XML generator for testing priority mapping
 */
function generateXML(callData) {
  console.log(`]: Generating XML for Call ID: ${callData.CallId}`);
  
  // Create a simple XML document for testing
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('CadIncident')
      .ele('Guid').txt('test-guid').up()
      .ele('IncidentNumber').txt(callData.CallId).up()
      .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up();
  
  // Add ResponseModeToScene value from the callData or map from Priority ID using our utility
  if (callData.ResponseModeToScene) {
    doc.ele('ResponseModeToScene').txt(callData.ResponseModeToScene).up();
    console.log(`]: Added ResponseModeToScene: ${callData.ResponseModeToScene}`);
  } else if (callData.Priority && callData.Priority.Id) {
    // If we have a Priority ID, map it using our utility
    const responseModeToScene = mapPriorityToEsoCode(callData.Priority.Id);
    doc.ele('ResponseModeToScene').txt(responseModeToScene).up();
    console.log(`]: Mapped Priority ID ${callData.Priority.Id} to ResponseModeToScene ${responseModeToScene}`);
  } else {
    // Default fallback using our centralized default
    doc.ele('ResponseModeToScene').txt(DEFAULT_RESPONSE_MODE).up();
    console.log(`]: No ResponseModeToScene value provided, using default value: ${DEFAULT_RESPONSE_MODE}`);
  }
  
  console.log(`]: Successfully generated XML for Call ID: ${callData.CallId}`);
  return doc.end({ prettyPrint: true });
}

/**
 * Test the XML generation with different Priority ID values
 */
async function testPriorityMapping() {
  console.log('Testing Priority to ResponseModeToScene mapping...');
  
  // Test case 1: Priority ID 1560 -> ResponseModeToScene 390 (lights & sirens)
  console.log('\nTest case 1: Priority ID 1560');
  let callData = {
    CallId: '12345',
    Timestamp: new Date().toISOString(),
    Nature: 'TEST 1560',
    Address: '123 Test St',
    Notes: 'Testing Priority ID 1560',
    Priority: {
      Id: 1560,
      Name: 'High Priority'
    }
  };
  
  let xmlData = generateXML(callData);
  let outputPath = path.join(tempDir, 'test_12345.xml');
  fs.writeFileSync(outputPath, xmlData);
  console.log(`XML file created at: ${outputPath}`);
  
  // Check if ResponseModeToScene tag exists with expected value
  if (xmlData.includes('<ResponseModeToScene>390</ResponseModeToScene>')) {
    console.log('✓ Test case 1 PASSED: ResponseModeToScene correctly set to 390 (lights & sirens)');
  } else {
    console.log('✗ Test case 1 FAILED: ResponseModeToScene not correctly set to 390');
  }
  
  // Test case 2: Priority ID 1559 -> ResponseModeToScene 395 (non-lights & sirens)
  console.log('\nTest case 2: Priority ID 1559');
  callData = {
    CallId: '12346',
    Timestamp: new Date().toISOString(),
    Nature: 'TEST 1559',
    Address: '123 Test St',
    Notes: 'Testing Priority ID 1559',
    Priority: {
      Id: 1559,
      Name: 'Normal Priority'
    }
  };
  
  xmlData = generateXML(callData);
  outputPath = path.join(tempDir, 'test_12346.xml');
  fs.writeFileSync(outputPath, xmlData);
  console.log(`XML file created at: ${outputPath}`);
  
  // Check if ResponseModeToScene tag exists with expected value
  if (xmlData.includes('<ResponseModeToScene>395</ResponseModeToScene>')) {
    console.log('✓ Test case 2 PASSED: ResponseModeToScene correctly set to 395 (non-lights & sirens)');
  } else {
    console.log('✗ Test case 2 FAILED: ResponseModeToScene not correctly set to 395');
  }
  
  // Test case 3: Missing ResponseModeToScene -> Default value 390
  console.log('\nTest case 3: No ResponseModeToScene (should use default)');
  callData = {
    CallId: '12347',
    Timestamp: new Date().toISOString(),
    Nature: 'TEST Missing',
    Address: '123 Test St',
    Notes: 'Testing missing ResponseModeToScene'
    // No ResponseModeToScene specified - should use default
  };
  
  xmlData = generateXML(callData);
  outputPath = path.join(tempDir, 'test_12347.xml');
  fs.writeFileSync(outputPath, xmlData);
  console.log(`XML file created at: ${outputPath}`);
  
  // Check if ResponseModeToScene tag exists with expected default value
  if (xmlData.includes('<ResponseModeToScene>390</ResponseModeToScene>')) {
    console.log('✓ Test case 3 PASSED: Default ResponseModeToScene correctly set to 390');
  } else {
    console.log('✗ Test case 3 FAILED: Default ResponseModeToScene not correctly set');
  }
  
  console.log('\nAll tests completed!');
}

testPriorityMapping();