/**
 * Test script for the direct Google Sheets export functionality
 */
require('dotenv').config();
const axios = require('axios');
const { logger } = require('./src/logger');
const tokenManager = require('./src/token-manager');
const sheetsLogger = require('./src/sheets-logger');

// Mock data for a single call
const MOCK_CALL = {
  CallId: "TEST123",
  Name: "Test Call for Export",
  Priority: 1,
  CallType: "Medical",
  NatureOfCall: "Test Nature",
  Address: "123 Test Street",
  City: "Test City",
  State: "TS",
  Zip: "12345",
  Notes: "This is a test call for direct export",
  LoggedOn: new Date().toISOString(),
  CallerName: "Test Caller",
  CallerNumber: "555-123-4567",
  Latitude: "35.1234",
  Longitude: "-80.9876",
  GeoType: 1,
  CallAction: 0,
  ResponderTextToUse: "Respond to test call"
};

// Mock extra data
const MOCK_EXTRA_DATA = {
  Dispatches: [
    {
      Type: "Unit",
      Name: "ENGINE1",
      Personnels: [],
      Notes: "Test dispatch note"
    }
  ],
  Activity: [
    {
      ActivityId: "ACT123",
      Name: "Status Change",
      StatusId: 5, // En Route
      Timestamp: new Date(Date.now() - 1800000).toISOString() // 30 minutes ago
    },
    {
      ActivityId: "ACT124",
      Name: "Status Change",
      StatusId: 6, // On Scene
      Timestamp: new Date(Date.now() - 1200000).toISOString() // 20 minutes ago
    }
  ]
};

/**
 * Test the direct export functionality
 */
async function testDirectExport() {
  try {
    logger.info('Testing Google Sheets direct export functionality...');
    
    // Test exporting a single mock call
    const result = await sheetsLogger.sheetCallRow(MOCK_CALL, MOCK_EXTRA_DATA);
    
    if (result) {
      logger.info('✅ Successfully exported test call to Google Sheets');
      return true;
    } else {
      logger.error('❌ Failed to export test call to Google Sheets');
      return false;
    }
  } catch (error) {
    logger.error(`❌ Error testing direct export: ${error.message}`);
    return false;
  }
}

/**
 * Run the tests
 */
async function runTests() {
  try {
    console.log('\n🔄 Testing Google Sheets direct export functionality...');
    
    const success = await testDirectExport();
    
    if (success) {
      console.log('\n✅ All tests passed!');
      console.log('\nNext steps:');
      console.log('1. Run export for active calls: node export-calls-to-sheets.js --active');
      console.log('2. Run export for recent calls: node export-calls-to-sheets.js --days=7');
      console.log('3. For Fly.io, use: ./export-calls-to-sheets.ps1 -Active\n');
    } else {
      console.log('\n❌ Tests failed. Please check your Google Sheets credentials and permissions.');
    }
  } catch (error) {
    console.error(`\n❌ Unexpected error: ${error.message}`);
  }
}

// Run the tests
runTests();