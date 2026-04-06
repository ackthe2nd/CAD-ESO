/**
 * Test script to verify Priority ID to ResponseModeToScene mapping with mock calls
 */
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');
const tempDir = '/tmp/resgrid-eso-test';
const { mapPriorityToEsoCode, DEFAULT_RESPONSE_MODE } = require('./src/utils/priority');

// Ensure temp directory exists
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Generate XML with the specific priority mapping
 */
function generateXML(callData) {
  console.log(`]: Generating XML for Call ID: ${callData.CallId}`);
  
  // Create XML document
  const doc = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
      .ele('Guid').txt('test-guid').up()
      .ele('IncidentNumber').txt(callData.CallId).up()
      .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up();
  
  // Map Resgrid Priority ID to ESO ResponseModeToScene value using our centralized utility
  let responseModeToScene = DEFAULT_RESPONSE_MODE; // Use our centralized default value
  if (callData.Priority && callData.Priority.Id) {
    // Use our centralized utility function for mapping
    responseModeToScene = mapPriorityToEsoCode(callData.Priority.Id);
    console.log(`]: Mapped Priority ID ${callData.Priority.Id} to ResponseModeToScene ${responseModeToScene}`);
  } else {
    console.log(`]: No Priority ID provided, using default ResponseModeToScene ${responseModeToScene}`);
  }
  
  // Add ResponseModeToScene to XML
  doc.ele('ResponseModeToScene').txt(responseModeToScene).up();
  
  // Add EMD_Performed if Priority.Name is available
  if (callData.Priority && callData.Priority.Name) {
    doc.ele('EMD_Performed').txt(callData.Priority.Name).up();
  }
  
  return doc.end({ prettyPrint: true });
}

/**
 * Test the priority mapping with specific mock calls
 */
async function testPriorityMockCalls() {
  console.log('Testing Priority ID mapping with mock calls...');
  
  // Test case 1: Priority ID 1560 -> ResponseModeToScene 390 (lights & sirens)
  console.log('\nTest case 1: Priority ID 1560 (High Priority)');
  const call1 = {
    CallId: '54321',
    Nature: 'Emergency Call - High Priority',
    Priority: {
      Id: 1560,
      Name: 'High Priority'
    }
  };
  
  const xml1 = generateXML(call1);
  const outputPath1 = path.join(tempDir, 'test_mock_1560.xml');
  fs.writeFileSync(outputPath1, xml1);
  console.log(`XML file created at: ${outputPath1}`);
  
  // Test case 2: Priority ID 1559 -> ResponseModeToScene 395 (non-lights & sirens)
  console.log('\nTest case 2: Priority ID 1559 (Normal Priority)');
  const call2 = {
    CallId: '54322',
    Nature: 'Standard Call - Normal Priority',
    Priority: {
      Id: 1559,
      Name: 'Normal Priority'
    }
  };
  
  const xml2 = generateXML(call2);
  const outputPath2 = path.join(tempDir, 'test_mock_1559.xml');
  fs.writeFileSync(outputPath2, xml2);
  console.log(`XML file created at: ${outputPath2}`);
  
  // Verify results
  const xmlContent1 = fs.readFileSync(outputPath1, 'utf8');
  const xmlContent2 = fs.readFileSync(outputPath2, 'utf8');
  
  if (xmlContent1.includes('<ResponseModeToScene>390</ResponseModeToScene>')) {
    console.log('✓ Test case 1 PASSED: Priority ID 1560 correctly mapped to ResponseModeToScene 390 (lights & sirens)');
  } else {
    console.log('✗ Test case 1 FAILED: Priority ID 1560 not correctly mapped');
  }
  
  if (xmlContent2.includes('<ResponseModeToScene>395</ResponseModeToScene>')) {
    console.log('✓ Test case 2 PASSED: Priority ID 1559 correctly mapped to ResponseModeToScene 395 (non-lights & sirens)');
  } else {
    console.log('✗ Test case 2 FAILED: Priority ID 1559 not correctly mapped');
  }
  
  console.log('\nAll mock call tests completed!');
}

// Run the tests
testPriorityMockCalls();