/**
 * Create a test call in Resgrid
 * This script will create a real test call in the Resgrid system,
 * which should trigger a CallAdded event to be received by our SignalR connection.
 */
require('dotenv').config();
const axios = require('axios');
const { getApiToken } = require('./src/token-manager');

/**
 * Create a test call with random data
 */
async function createTestCall(token) {
  try {
    console.log('Creating test call in Resgrid...');
    
    // Generate a random test call
    const randomNum = Math.floor(Math.random() * 10000);
    const testCall = {
      Name: `TEST CALL #${randomNum}`,
      Priority: 1560, // Emergent (high priority)
      Notes: `Test call created on ${new Date().toISOString()}`,
      Address: "123 Test Street, Test City, CA 90210",
      // Add any other required fields
    };
    
    console.log(`Prepared test call: ${testCall.Name}`);
    
    // POST to the create call endpoint (try different API endpoint)
    const response = await axios({
      method: 'POST',
      url: 'https://api.resgrid.com/api/v4/Calls/SaveCall',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: testCall
    });
    
    if (response.status === 200 || response.status === 201) {
      console.log('✅ Successfully created test call in Resgrid');
      console.log(`Call ID: ${response.data?.Data?.CallId || 'unknown'}`);
      console.log('This should trigger a CallAdded event in the SignalR connection');
      console.log('Check the ResgridESOBridge workflow logs for the event');
      
      return response.data;
    } else {
      console.error(`❌ Unexpected response status: ${response.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error creating test call: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return null;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    // Get API token
    const token = await getApiToken();
    console.log('Successfully obtained API token');
    
    // Create test call
    await createTestCall(token);
    
    console.log('\nWaiting to see if the SignalR connection receives the event...');
    console.log('Check the ResgridESOBridge workflow logs for "RECEIVED CALL EVENT" messages');
    
    // Wait for a while to allow time for the event to be received
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('Done waiting. If no event was received, check the ResgridESOBridge workflow logs');
  } catch (error) {
    console.error(`Unexpected error: ${error.message}`);
  }
}

// Run the main function
main().catch(error => {
  console.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});