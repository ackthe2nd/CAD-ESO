/**
 * Test script to verify how Google Sheets handles different XML sizes
 * This script tests logging XML of different sizes to ensure proper cell handling
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { sheetLog } = require('./src/sheets-logger');
const logger = require('./src/fix-logger');

// Create XML of different sizes for testing
function generateTestXML(size) {
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>TEST-SIZE-${size}</IncidentNumber>
  <IncidentOrOnset>2025-05-10T03:00:00Z</IncidentOrOnset>
  <DispatchNotified>2025-05-10T03:00:00Z</DispatchNotified>
  <IncidentAddress1>123 Test Street</IncidentAddress1>
  <IncidentCity>Testville</IncidentCity>
  <IncidentState>TS</IncidentState>
  <IncidentZip>12345</IncidentZip>
  <CadDispatchText>Test XML upload with size ${size} characters</CadDispatchText>
  <EmsUnitCallSign>STN1,BLS11</EmsUnitCallSign>
  <UnitNotifiedByDispatch>STN1,BLS11</UnitNotifiedByDispatch>
  <ResponseModeToScene>390</ResponseModeToScene>
  <CallNature>Test Call</CallNature>
  <CallNatureDescription>This is a test call to verify XML size handling</CallNatureDescription>`;
  
  // Add padding to reach desired size
  const currentSize = xml.length;
  const paddingSize = size - currentSize - 14; // Account for closing tag
  
  if (paddingSize > 0) {
    xml += `\n  <TestPadding>` + 'X'.repeat(paddingSize) + `</TestPadding>`;
  }
  
  xml += `\n</CadIncident>`;
  
  return xml;
}

async function testXMLSizeHandling() {
  try {
    logger.info('Testing XML size handling in Google Sheets...');
    
    // Test with progressively larger XML sizes
    const sizes = [1000, 5000, 10000, 20000, 30000, 40000, 50000];
    
    for (const size of sizes) {
      const xml = generateTestXML(size);
      const actualSize = xml.length;
      
      logger.info(`Testing XML of size ${actualSize} characters...`);
      
      // Log with detailed status
      const status = `Call ID TEST-SIZE-${size} - XML Size Test`;
      await sheetLog(`Testing XML size handling with ${actualSize} characters`, 'info', status, xml);
      
      logger.info(`✅ Successfully logged XML of size ${actualSize} characters to Google Sheets`);
    }
    
    logger.info('✅ All XML size tests completed!');
  } catch (error) {
    logger.error(`❌ Error testing XML size handling: ${error.message}`);
  }
}

// Run the test
testXMLSizeHandling();