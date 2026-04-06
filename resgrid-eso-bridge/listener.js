const signalR = require('@microsoft/signalr');
const axios = require('axios');
const SftpClient = require('ssh2-sftp-client');
const { create } = require('xmlbuilder2');
const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Load environment variables, supporting both naming conventions
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;
const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_USER = process.env.SFTP_USER || process.env.SFTP_USERNAME;
const SFTP_PASS = process.env.SFTP_PASS || process.env.SFTP_PASSWORD;
const SFTP_DIR = process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH;

// Module-level variables for token caching
let apiToken = null;
let tokenExpiry = 0;

// Create temp directory for storing XML files
const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Logger function for consistent logging
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMethod = isError ? console.error : console.log;
  logMethod(`[${timestamp}] ${message}`);
}

/**
 * Generates XML for ESO from call data
 */
function generateXML(callData) {
  try {
    log(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Create XML document
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt('b394de98-a5b7-408d-a1f2-020eddff92b9').up()
        .ele('IncidentNumber').txt(callData.CallId).up()
        .ele('IncidentOrOnset').txt(callData.Timestamp || new Date().toISOString()).up()
        .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up()
        .ele('VehicleDispatchLocation').txt(callData.Address || '').up()
        .ele('EmsUnitCallSign').txt(callData.UnitsCsv || '').up()
        .ele('CadDispatchText').txt(callData.Notes || '').up()
      .doc();
    
    return doc.end({ prettyPrint: true });
  } catch (error) {
    log(`Error generating XML: ${error.message}`, true);
    throw error;
  }
}

/**
 * Uploads a file to ESO via SFTP
 */
async function uploadToSFTP(localFilePath, remoteFilePath) {
  const sftp = new SftpClient();
  
  try {
    log(`Connecting to SFTP server at ${SFTP_HOST}`);
    
    await sftp.connect({
      host: SFTP_HOST,
      port: 22, // Default SFTP port
      username: SFTP_USER,
      password: SFTP_PASS
    });
    
    // Check if remote directory exists and create if needed
    const dirExists = await sftp.exists(SFTP_DIR);
    if (!dirExists) {
      log(`Creating remote directory: ${SFTP_DIR}`);
      await sftp.mkdir(SFTP_DIR, true);
    }
    
    // Upload the file
    await sftp.put(localFilePath, remoteFilePath);
    log(`File uploaded successfully to ${remoteFilePath}`);
    
    return true;
  } catch (error) {
    log(`SFTP upload failed: ${error.message}`, true);
    throw error;
  } finally {
    // Always disconnect
    try {
      await sftp.end();
    } catch (error) {
      log(`Error disconnecting from SFTP: ${error.message}`, true);
    }
  }
}

/**
 * Gets a valid Resgrid API token, refreshing if necessary
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    // If we have a token and it's still valid (with 60 seconds buffer)
    if (apiToken && Date.now() < tokenExpiry - 60000) {
      log('Using cached API token');
      return apiToken;
    }
    
    log('Fetching new Resgrid API token...');
    log(`Using username: ${RESGRID_USER}`);
    
    const requestData = {
      username: RESGRID_USER,
      password: RESGRID_PASS
    };
    
    // Use the working endpoint
    const endpoints = [
      'https://api.resgrid.com/api/v4/Connect/token'
    ];
    
    let response = null;
    let successEndpoint = null;
    
    for (const endpoint of endpoints) {
      log(`Testing endpoint: ${endpoint}`);
      
      try {
        if (endpoint.includes('Token')) {
          // For OAuth style endpoint
          const formData = new URLSearchParams();
          formData.append('grant_type', 'password');
          formData.append('username', RESGRID_USER);
          formData.append('password', RESGRID_PASS);
          
          response = await axios.post(
            endpoint,
            formData,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              validateStatus: status => true
            }
          );
        } else {
          // For JSON style endpoint
          response = await axios.post(
            endpoint,
            requestData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              },
              validateStatus: status => true
            }
          );
        }
        
        log(`Response status from ${endpoint}: ${response.status}`);
        
        if (response.status === 200) {
          log(`Found working endpoint: ${endpoint}`);
          successEndpoint = endpoint;
          break;
        }
      } catch (error) {
        log(`Error with endpoint ${endpoint}: ${error.message}`, true);
      }
    }
    
    if (!successEndpoint) {
      log('No endpoint worked, authentication failed');
      throw new Error('Authentication failed');
    }
    
    log(`Response status: ${response.status}`);
    log(`Response headers: ${JSON.stringify(response.headers, null, 2)}`);
    
    if (response.status !== 200) {
      log(`Error response: ${JSON.stringify(response.data, null, 2)}`, true);
    }
    
    if (response.status === 200 && response.data && response.data.access_token) {
      log('Successfully obtained new API token');
      
      // Store the token and calculate expiry time
      apiToken = response.data.access_token;
      
      // Convert expiresIn (seconds) to milliseconds and calculate expiry timestamp
      const expiresInMs = (response.data.expires_in || 3600) * 1000;
      tokenExpiry = Date.now() + expiresInMs;
      
      return apiToken;
    } else {
      log('Failed to obtain API token: Unexpected response format', true);
      throw new Error('Failed to obtain API token: Invalid response');
    }
  } catch (error) {
    log(`Failed to obtain API token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetches additional call data from Resgrid API
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object|null>} The call data or null if an error occurred
 */
async function getCallExtra(callId) {
  try {
    log(`Fetching extra data for Call ID: ${callId}`);
    
    // First ensure we have a valid token
    const token = await getApiToken();
    if (!token) {
      log(`Failed to obtain API token for Call ID: ${callId}`, true);
      return null;
    }
    
    log(`API token obtained successfully, making API call for call data`);
    log(`GET https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`);
    
    const response = await axios.get(
      `https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, 
      {
        params: { callId },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        validateStatus: status => true // Accept all status codes for debugging
      }
    );
    
    log(`API call response status: ${response.status}`);
    
    if (response.status === 200 && response.data) {
      log(`Successfully fetched data for Call ID: ${callId}`);
      log(`Call data: ${JSON.stringify(response.data, null, 2)}`);
      return response.data;
    } else {
      log(`Unexpected response for Call ID: ${callId}`, true);
      log(`Error response: ${JSON.stringify(response.data, null, 2)}`, true);
      return null;
    }
  } catch (error) {
    log(`API Error for Call ID: ${callId}: ${error.message}`, true);
    if (error.response) {
      log(`Error details: ${JSON.stringify(error.response.data, null, 2)}`, true);
    }
    return null;
  }
}

/**
 * Processes a new call from Resgrid
 */
async function processCallAdded(callData) {
  try {
    log(`Received CallAdded event for Call ID: ${callData.CallId}`);
    
    // Fetch extra data from Resgrid API using the new helper
    const callExtraData = await getCallExtra(callData.CallId);
    if (!callExtraData) {
      log(`Failed to fetch extra data for Call ID: ${callData.CallId}`, true);
      return;
    }
    
    // Extract unit names from dispatches
    const unitDispatches = callExtraData.Dispatches.filter(d => d.Type === "Unit");
    const unitsCsv = unitDispatches.map(d => d.Name).join(', ');
    
    // Generate XML
    const xmlData = generateXML({
      CallId: callData.CallId,
      Timestamp: callData.Timestamp || new Date().toISOString(),
      Nature: callData.Nature || callExtraData.Nature || '',
      Address: callData.Address || callExtraData.Address || '',
      UnitsCsv: unitsCsv,
      Notes: callData.Notes || callExtraData.Notes || ''
    });
    
    // Save XML to temp file
    const tempFilePath = path.join(tempDir, `incident_${callData.CallId}_temp.xml`);
    fs.writeFileSync(tempFilePath, xmlData);
    
    // Upload to SFTP server
    const remoteFilePath = `${SFTP_DIR}/incident_${callData.CallId}.xml`;
    await uploadToSFTP(tempFilePath, remoteFilePath);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    log(`✅ pushed ${callData.CallId}`);
  } catch (error) {
    log(`❌ Error processing call ${callData.CallId}: ${error.message}`, true);
  }
}

/**
 * Main function to initialize and run the service
 */
async function main() {
  // Validate required environment variables
  if (!RESGRID_USER) {
    log('Missing required environment variable: RESGRID_USER', true);
    process.exit(1);
  }
  
  if (!RESGRID_PASS) {
    log('Missing required environment variable: RESGRID_PASS', true);
    process.exit(1);
  }
  
  if (!SFTP_HOST) {
    log('Missing required environment variable: SFTP_HOST', true);
    process.exit(1);
  }
  
  if (!SFTP_USER) {
    log('Missing required environment variable: SFTP_USER or SFTP_USERNAME', true);
    process.exit(1);
  }
  
  if (!SFTP_PASS) {
    log('Missing required environment variable: SFTP_PASS or SFTP_PASSWORD', true);
    process.exit(1);
  }
  
  if (!SFTP_DIR) {
    log('Missing required environment variable: SFTP_DIR or SFTP_REMOTE_PATH', true);
    process.exit(1);
  }
  
  // For clarity in logs
  log('Environment configuration:');
  log(`  RESGRID_USER: ${RESGRID_USER ? '✓ Set' : '✗ Missing'}`);
  log(`  RESGRID_PASS: ${RESGRID_PASS ? '✓ Set' : '✗ Missing'}`);
  log(`  SFTP_HOST: ${SFTP_HOST}`);
  log(`  SFTP_USER: ${SFTP_USER} (from ${process.env.SFTP_USER ? 'SFTP_USER' : 'SFTP_USERNAME'})`);
  log(`  SFTP_DIR: ${SFTP_DIR} (from ${process.env.SFTP_DIR ? 'SFTP_DIR' : 'SFTP_REMOTE_PATH'})`);
  
  // All environment variables have been validated
  
  try {
    log('Starting Resgrid to ESO bridge service...');
    
    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('https://events.resgrid.com/eventingHub')
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.elapsedMilliseconds > 60000) {
            return null; // Stop retrying after 60 seconds
          }
          // Exponential backoff
          return Math.min(Math.pow(2, retryContext.previousRetryCount) * 1000, 30000);
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();
    
    // Set up event handler for CallAdded
    connection.on('CallAdded', processCallAdded);
    
    // Set up connection status handlers
    connection.onreconnecting((error) => {
      log(`SignalR connection lost. Attempting to reconnect... ${error ? error.message : ''}`, true);
    });
    
    connection.onreconnected((connectionId) => {
      log(`SignalR connection reestablished. ConnectionId: ${connectionId}`);
    });
    
    connection.onclose((error) => {
      log(`SignalR connection closed: ${error ? error.message : ''}`, true);
    });
    
    // Start the connection
    await connection.start();
    log(`Connected to Resgrid SignalR hub. ConnectionId: ${connection.connectionId}`);
    
    // Setup graceful shutdown
    process.on('SIGINT', async () => {
      log('Shutting down service...');
      await connection.stop();
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      log('Shutting down service...');
      await connection.stop();
      process.exit(0);
    });
    
    log('Service started successfully');
  } catch (error) {
    log(`Failed to initialize service: ${error.message}`, true);
    process.exit(1);
  }
}

// Start the service
main();