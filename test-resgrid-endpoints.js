require('dotenv').config();
const axios = require('axios');

// Load Resgrid credentials from environment variables
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;

/**
 * Logger function for consistent logging
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMethod = isError ? console.error : console.log;
  logMethod(`[${timestamp}] ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching Resgrid API token...');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', RESGRID_USER);
    formData.append('password', RESGRID_PASS);
    
    const response = await axios.post(
      'https://api.resgrid.com/api/v4/Connect/token',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.status === 200 && response.data.access_token) {
      log('Successfully obtained API token');
      return response.data.access_token;
    } else {
      throw new Error('Failed to obtain API token: Invalid response');
    }
  } catch (error) {
    log(`Failed to obtain API token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Tests an API endpoint
 * @param {string} token - The API token
 * @param {string} endpoint - The endpoint to test
 * @param {Object} params - Query parameters (optional)
 */
async function testEndpoint(token, endpoint, params = {}) {
  try {
    log(`Testing endpoint: ${endpoint}`);
    
    const response = await axios.get(
      `https://api.resgrid.com/api/v4/${endpoint}`,
      {
        params,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        validateStatus: () => true // Accept any status code
      }
    );
    
    log(`Response status: ${response.status}`);
    
    if (response.status === 200) {
      log('Endpoint is valid');
      
      if (Array.isArray(response.data)) {
        log(`Returned ${response.data.length} items`);
        
        if (response.data.length > 0) {
          log('First item:');
          console.log(JSON.stringify(response.data[0], null, 2));
        }
      } else if (response.data) {
        log('Response data:');
        console.log(JSON.stringify(response.data, null, 2));
      }
    } else {
      log(`Endpoint returned error: ${response.status}`);
      if (response.data) {
        log('Error response:');
        console.log(JSON.stringify(response.data, null, 2));
      }
    }
    
    console.log('\n-------------------------------------------\n');
  } catch (error) {
    log(`Error testing endpoint ${endpoint}: ${error.message}`, true);
    console.log('\n-------------------------------------------\n');
  }
}

/**
 * Main function to test various Resgrid API endpoints
 */
async function main() {
  try {
    // Validate required environment variables
    if (!RESGRID_USER || !RESGRID_PASS) {
      log('Missing required Resgrid credentials (RESGRID_USER, RESGRID_PASS)', true);
      process.exit(1);
    }
    
    // Get API token
    const token = await getApiToken();
    
    // List of endpoints to test
    const endpoints = [
      'Calls',                     // Try root calls endpoint
      'Calls/GetActiveCalls',      // Active calls
      'Calls/GetAllCalls',         // All calls
      'Calls/GetCall',             // Needs callId parameter
      'Calls/GetAllCallPriorities', // Call priorities
      'Calls/GetAllCallTypes',     // Call types
      'Calls/GetCallNotes',        // Needs callId parameter
      'Calls/GetCallsForDepartment' // All calls for department
    ];
    
    // Test each endpoint
    for (const endpoint of endpoints) {
      await testEndpoint(token, endpoint);
    }
    
    // Test GetCall with a parameter (using callId=1 as an example)
    await testEndpoint(token, 'Calls/GetCall', { callId: 1 });
    
  } catch (error) {
    log(`Test failed: ${error.message}`, true);
    process.exit(1);
  }
}

// Start the process
log('Starting Resgrid API endpoint tests...');
main().catch(error => {
  log(`Unhandled error: ${error.message}`, true);
  process.exit(1);
});