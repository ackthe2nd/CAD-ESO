/**
 * Generate XML for the latest active call
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
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
 * Fetch active calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @returns {Promise<Array>} List of active calls
 */
async function fetchActiveCalls(token) {
  try {
    log('Fetching active calls...');
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.Data) {
      const calls = response.data.Data;
      log(`Found ${calls.length} active calls`);
      return calls;
    } else {
      log('No active calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Error fetching active calls: ${error.message}`, true);
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
 * Main function
 */
async function main() {
  try {
    log('Starting to fetch the latest call...');
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch active calls
    const activeCalls = await fetchActiveCalls(token);
    
    if (activeCalls.length === 0) {
      log('No active calls found. Trying to use existing test data...');
      
      // Use our test call ID as a fallback
      const testCallId = '198424';
      log(`Using test call ID: ${testCallId}`);
      
      // Check if we have stored data for this call
      const sampleCallPath = path.join(__dirname, 'logs', `call_${testCallId}_GetCall.json`);
      
      if (fs.existsSync(sampleCallPath)) {
        log(`Loading existing sample data for call ${testCallId} from ${sampleCallPath}`);
        const callDataRaw = fs.readFileSync(sampleCallPath, 'utf8');
        const callData = JSON.parse(callDataRaw);
        
        // Fetch extra data
        const extraData = await getCallExtraData(token, testCallId);
        
        // Generate XML
        const combinedData = {
          GetCall: callData,
          GetCallExtraData: extraData
        };
        
        const xml = generateXML(combinedData);
        
        // Save XML to file
        const logsDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const outputPath = path.join(logsDir, `latest_call_${testCallId}_${timestamp}.xml`);
        fs.writeFileSync(outputPath, xml);
        
        log(`Generated XML saved to: ${outputPath}`);
        log(`XML contents:`);
        console.log(xml);
      } else {
        log(`No existing sample data found for test call ${testCallId}`, true);
      }
    } else {
      // Use the most recent active call
      const latestCall = activeCalls[0];
      const callId = latestCall.Id || latestCall.CallId;
      
      log(`Processing latest call ${callId}...`);
      
      // Fetch extra data
      const extraData = await getCallExtraData(token, callId);
      
      // Generate XML
      const combinedData = {
        GetCall: { Data: latestCall },
        GetCallExtraData: extraData
      };
      
      const xml = generateXML(combinedData);
      
      // Save XML to file
      const logsDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
      const outputPath = path.join(logsDir, `latest_call_${callId}_${timestamp}.xml`);
      fs.writeFileSync(outputPath, xml);
      
      log(`Generated XML saved to: ${outputPath}`);
      log(`XML contents:`);
      console.log(xml);
    }
    
    log('Process completed successfully');
  } catch (error) {
    log(`Error in main function: ${error.message}`, true);
  }
}

// Run the main function
main();