/**
 * Fetch more detailed information about a call from Resgrid API
 * This script tries multiple endpoints to get more information about call ID 198424
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  resgrid: {
    tokenUrl: 'https://api.resgrid.com/api/v4/Connect/token',
    baseUrl: 'https://api.resgrid.com/api/v4'
  },
  auth: {
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }
};

// Logger function for consistent logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMethod = isError ? console.error : console.log;
  logMethod(`${timestamp} - ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching new Resgrid API token...');
    
    // Encode credentials for Basic Auth
    const tokenResponse = await axios.post(
      config.resgrid.tokenUrl,
      new URLSearchParams({
        grant_type: 'password',
        username: config.auth.username,
        password: config.auth.password
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (tokenResponse.data && tokenResponse.data.access_token) {
      log('Successfully obtained new API token');
      return tokenResponse.data.access_token;
    } else {
      throw new Error('Invalid token response from Resgrid API');
    }
  } catch (error) {
    log(`Failed to get API token: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    throw error;
  }
}

/**
 * Try multiple endpoints to get information about a call
 * @param {string} token - API token
 * @param {string} callId - Call ID to fetch
 */
async function tryMultipleEndpoints(token, callId) {
  const endpoints = [
    { url: `${config.resgrid.baseUrl}/Calls/GetCallById`, params: { callId } },
    { url: `${config.resgrid.baseUrl}/Calls/GetCall`, params: { callId } },
    { url: `${config.resgrid.baseUrl}/Calls/GetCallExtraData`, params: { callId } },
    { url: `${config.resgrid.baseUrl}/Calls/GetCallDetails`, params: { callId } },
    { url: `${config.resgrid.baseUrl}/Calls/GetCallDetailsByDepartment`, params: { callId } }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      log(`Trying endpoint: ${endpoint.url}`);
      const response = await axios.get(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: endpoint.params
      });
      
      if (response.data) {
        const endpointName = endpoint.url.split('/').pop();
        log(`Success with ${endpointName}!`);
        results[endpointName] = response.data;
        
        // Save the response to a file
        const filename = `call_${callId}_${endpointName}.json`;
        const filePath = path.join(__dirname, 'logs', filename);
        fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2));
        log(`Data saved to: ${filePath}`);
      }
    } catch (error) {
      log(`Error with endpoint ${endpoint.url}: ${error.message}`, true);
      if (error.response) {
        log(`Response status: ${error.response.status}`, true);
      }
    }
  }
  
  return results;
}

/**
 * Main function to try different endpoints
 */
async function main() {
  try {
    const TARGET_CALL_ID = '198424';
    log(`Trying to get detailed information for call ${TARGET_CALL_ID}...`);
    
    // Get API token
    const token = await getApiToken();
    
    // Try multiple endpoints
    const results = await tryMultipleEndpoints(token, TARGET_CALL_ID);
    
    // Summarize what we found
    const endpointsThatWorked = Object.keys(results);
    if (endpointsThatWorked.length > 0) {
      log(`\nSummary: Found data from these endpoints: ${endpointsThatWorked.join(', ')}`);
      log(`Check the logs directory for detailed JSON responses.`);
    } else {
      log(`\nNo endpoints returned valid data for call ${TARGET_CALL_ID}.`);
    }
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the main function
main();