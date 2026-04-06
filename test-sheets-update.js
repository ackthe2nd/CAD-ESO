/**
 * Test utility for Google Sheets integration
 * This script simulates a new call and logs it to Google Sheets
 * to test the integration is working properly
 */
require('dotenv').config();
const { getApiToken } = require('./src/token-manager');
const { sheetCallRow } = require('./src/sheets-logger');
const logger = require('./src/fix-logger');

/**
 * Create a test call to log to Google Sheets
 */
async function main() {
  try {
    console.log('Starting Google Sheets update test...');
    
    // Get an API token
    const token = await getApiToken();
    console.log('Successfully obtained Resgrid API token');
    
    // Create a simulated call
    const simulatedCall = {
      CallId: `TEST-${Date.now()}`,
      Nature: "Test Call - " + new Date().toLocaleTimeString(),
      Address: "123 Test Street, Test City, TS 12345",
      Priority: {
        Id: "1560",
        Name: "Emergent"
      },
      Timestamp: new Date().toISOString(),
      Notes: "This is a test call created via the test-sheets-update.js script"
    };
    
    console.log(`Created simulated call with ID: ${simulatedCall.CallId}`);
    
    // Create simulated extra data
    const simulatedExtraData = {
      Dispatches: [
        {
          Type: "Unit",
          Name: "STN1",
          Location: "Station 1",
          EnRouteTime: new Date().toISOString()
        }
      ],
      Activity: [
        {
          Type: "Unit",
          StatusId: 5, // En Route
          Timestamp: new Date().toISOString()
        }
      ]
    };
    
    // Log to Google Sheets
    console.log('Attempting to log simulated call to Google Sheets...');
    const success = await sheetCallRow(simulatedCall, simulatedExtraData);
    
    if (success) {
      console.log('✅ Successfully logged test call to Google Sheets!');
    } else {
      console.error('❌ Failed to log test call to Google Sheets');
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error(error.stack);
  }
}

// Run the test
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});