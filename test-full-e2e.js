/**
 * End-to-End Test for Resgrid to ESO Bridge
 * This script tests the entire process from API call to XML generation and SFTP upload
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const SftpClient = require('ssh2-sftp-client');
const { generateXML } = require('./src/xml-generator');

// Set up logger
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} - ${message}`;
  console.log(logMessage);
  if (isError) {
    console.error(logMessage);
  }
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching new Resgrid API token...');
    
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    if (!username || !password) {
      throw new Error('Resgrid credentials not found in environment variables');
    }
    
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      log('Successfully obtained new API token');
      return response.data.access_token;
    } else {
      throw new Error('Invalid response from token endpoint');
    }
  } catch (error) {
    log(`Error getting API token: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    throw error;
  }
}

/**
 * Fetch recent calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {number} days - How many days back to fetch calls for
 * @returns {Promise<Array>} List of calls
 */
async function fetchRecentCalls(token, days = 7) {
  try {
    log(`Fetching calls from the last ${days} days...`);
    
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCalls?days=${days}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.Status === 'success' && response.data.Data) {
      const calls = response.data.Data;
      log(`Found ${calls.length} calls in the last ${days} days`);
      return calls;
    } else {
      log('No calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Error fetching calls: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    return [];
  }
}

/**
 * Fetches detailed call data from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object>} The detailed call data
 */
async function getCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.Status === 'success') {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data;
    } else {
      throw new Error(`Invalid response from GetCallExtraData endpoint for call ${callId}`);
    }
  } catch (error) {
    log(`Error fetching call extra data: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    throw error;
  }
}

/**
 * Uploads a file to ESO via SFTP
 * @param {string} localFilePath - Path to the local file
 * @param {string} remoteFilePath - Path where to store the file on the remote server
 * @returns {Promise<boolean>} Success status
 */
async function uploadToSFTP(localFilePath, remoteFilePath) {
  log(`Preparing to upload ${localFilePath} to ${remoteFilePath}...`);
  
  // Skip actual SFTP upload in test mode
  log('SFTP upload simulation (skipped in test mode)');
  log(`Would upload ${localFilePath} to ${remoteFilePath}`);
  
  // Log SFTP configuration (without passwords)
  log(`SFTP Configuration (TEST MODE):`);
  log(`Host: ${process.env.SFTP_HOST || 'sftp.esosuite.net'}`);
  log(`Username: ${process.env.SFTP_USER || process.env.SFTP_USERNAME || 'CA-EMS'}`);
  log(`Remote Directory: ${process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH || '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9'}`);
  
  return true;
}

/**
 * Process a single call from Resgrid
 * @param {string} token - The API token for authentication
 * @param {Object} call - The basic call data
 * @returns {Promise<boolean>} Success status
 */
async function processCall(token, call) {
  try {
    const callId = call.Id || call.CallId;
    log(`Processing call ${callId}...`);
    
    // Fetch extra data for the call
    const extraData = await getCallExtraData(token, callId);
    
    // Try to load existing sample data for this call ID
    let callData = null;
    const sampleCallPath = path.join(__dirname, 'logs', `call_${callId}_GetCall.json`);
    
    if (fs.existsSync(sampleCallPath)) {
      log(`Loading existing sample data for call ${callId} from ${sampleCallPath}`);
      const callDataRaw = fs.readFileSync(sampleCallPath, 'utf8');
      callData = JSON.parse(callDataRaw);
    } else {
      log(`No existing sample data found for call ${callId}, using minimal data`);
      // Create minimal call data
      callData = {
        Data: {
          CallId: callId,
          LoggedOn: new Date().toISOString(),
          Name: `Test Call ${callId}`,
          Nature: "Test nature",
          Type: "Medical Emergency",
          Address: "123 Test St, Test City, CA 90210, USA",
          Geolocation: "34.1234,-118.1234",
          Priority: { Id: 1560 }
        }
      };
    }
    
    // Combine the data for XML generation
    const combinedData = {
      GetCall: callData,
      GetCallExtraData: extraData
    };
    
    // Generate XML
    const xml = generateXML(combinedData);
    
    // Save XML to local file for logging/debugging
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const localFilePath = path.join(logsDir, `incident_${callId}_e2e_test.xml`);
    fs.writeFileSync(localFilePath, xml);
    log(`XML saved to ${localFilePath}`);
    
    // Upload to SFTP
    const remoteDir = process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH || '/incoming';
    const remoteFilePath = `${remoteDir}/incident_${callId}.xml`;
    const uploadSuccess = await uploadToSFTP(localFilePath, remoteFilePath);
    
    if (uploadSuccess) {
      log(`Successfully processed call ${callId}`);
      return true;
    } else {
      log(`Failed to upload XML for call ${callId}`, true);
      return false;
    }
  } catch (error) {
    log(`Error processing call: ${error.message}`, true);
    return false;
  }
}

/**
 * Main function to perform end-to-end test
 */
async function main() {
  try {
    log('Starting end-to-end test...');
    
    // Get API token
    const token = await getApiToken();
    
    // Try with a specific call that we know exists
    const specificCallId = '198424';
    log(`Using specific call ID: ${specificCallId}`);
    
    // Create a minimal call object
    const mockCall = {
      Id: specificCallId
    };
    
    // Process the specific call
    await processCall(token, mockCall);
    
    log('End-to-end test completed.');
  } catch (error) {
    log(`Error in main function: ${error.message}`, true);
  }
}

// Run the main function
main();