/**
 * Test script to verify XML upload logging to Google Sheets
 * This script will generate test XML and log it to the Google Sheets logs
 */
require('dotenv').config();
const logger = require('./src/fix-logger');
const sheetsLogger = require('./src/sheets-logger');

// Sample XML for testing
const TEST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>TEST-123</IncidentNumber>
  <IncidentOrOnset>2025-05-10T01:23:45Z</IncidentOrOnset>
  <DispatchNotified>2025-05-10T01:23:45Z</DispatchNotified>
  <IncidentAddress1>123 Test Street</IncidentAddress1>
  <IncidentCity>Testville</IncidentCity>
  <IncidentState>TS</IncidentState>
  <IncidentZip>12345</IncidentZip>
  <CadDispatchText>This is a test dispatch text for XML logging.</CadDispatchText>
  <EmsUnitCallSign>STN1,BLS11</EmsUnitCallSign>
  <UnitNotifiedByDispatch>STN1,BLS11</UnitNotifiedByDispatch>
  <ResponseModeToScene>390</ResponseModeToScene>
  <CallNature>Test Call</CallNature>
  <CallNatureDescription>This is a test call to verify XML logging</CallNatureDescription>
</CadIncident>`;

// Test with extremely large XML to verify handling
const LARGE_XML = TEST_XML.replace('</CadIncident>', `  <ExtraLargeField>${'X'.repeat(30000)}</ExtraLargeField>\n</CadIncident>`);

async function testXmlLogging() {
  try {
    logger.info('Logger test successful');
    
    // Initialize Google Sheets
    await sheetsLogger.initialize();
    
    logger.info('Starting XML upload logging test...');
    
    // 1. Test logging a successful XML upload with status
    logger.info('Testing successful XML upload logging...');
    const successMessage = 'XML file uploaded to sftp.esosuite.net: test_123.xml for Call ID: 12345';
    const successStatus = 'Call ID 12345 - XML Upload Successful';
    console.log(`Logging with status: "${successStatus}" and XML length: ${TEST_XML.length}`);
    await sheetsLogger.sheetLog(successMessage, 'info', successStatus, TEST_XML);
    logger.info('✅ Successfully logged successful XML upload to Google Sheets');
    
    // 2. Test logging a failed XML upload with error status
    logger.info('Testing failed XML upload logging...');
    const failMessage = 'Failed to upload XML file to sftp.esosuite.net: test_456.xml for Call ID: 45678';
    const failStatus = 'Call ID 45678 - Upload Failed - Error: Connection timeout';
    await sheetsLogger.sheetLog(failMessage, 'error', failStatus, TEST_XML);
    logger.info('✅ Successfully logged failed XML upload to Google Sheets');
    
    // 3. Test with large XML that might exceed cell limits
    logger.info('Testing large XML upload logging...');
    const largeMessage = 'Testing large XML upload for Call ID: 98765';
    const largeStatus = 'Call ID 98765 - Testing Large XML';
    await sheetsLogger.sheetLog(largeMessage, 'info', largeStatus, LARGE_XML);
    logger.info('✅ Successfully logged large XML upload to Google Sheets');
    
    logger.info('✅ All XML upload logging tests passed!');
  } catch (error) {
    logger.error(`❌ Error testing XML upload logging: ${error.message}`);
    console.error(error);
  }
}

// Run the test
testXmlLogging();