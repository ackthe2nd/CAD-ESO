/**
 * Resgrid to ESO Bridge - Fetch Existing Calls Utility (Fixed Version)
 * 
 * This script fetches existing calls from Resgrid API, 
 * generates XML for each, and uploads them to ESO via SFTP.
 * 
 * Usage:
 *   node fixed-fetch-existing-calls.js [--days=N]
 *   where N is the number of days to look back (default: 7)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const SftpClient = require('ssh2-sftp-client');
const { create } = require('xmlbuilder2');
const { logger } = require('./src/logger');
const sheetsLogger = require('./src/sheets-logger');

// Parse command line arguments
const args = process.argv.slice(2);
const daysArg = args.find(arg => arg.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;

// Configuration from environment variables
const config = {
  resgrid: {
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  },
  sftp: {
    host: process.env.SFTP_HOST || process.env.SFTP_SERVER,
    port: parseInt(process.env.SFTP_PORT || '22', 10),
    username: process.env.SFTP_USER || process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASS || process.env.SFTP_PASSWORD,
    remoteDir: process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH || '/incoming'
  }
};

// Verify required configuration
function checkConfig() {
  // Check Resgrid credentials
  if (!config.resgrid.username || !config.resgrid.password) {
    logger.error('Missing Resgrid credentials. Set RESGRID_USER and RESGRID_PASS environment variables.');
    return false;
  }
  
  // Log SFTP configuration
  console.log('Environment configuration:');
  console.log('  RESGRID_USER: ' + (config.resgrid.username ? '✓ Set' : '❌ Missing'));
  console.log('  RESGRID_PASS: ' + (config.resgrid.password ? '✓ Set' : '❌ Missing'));
  console.log('  SFTP_HOST: ' + config.sftp.host);
  console.log('  SFTP_USER: ' + config.sftp.username + (process.env.SFTP_USER ? ' (from SFTP_USER)' : ' (from SFTP_USERNAME)'));
  console.log('  SFTP_DIR: ' + config.sftp.remoteDir + (process.env.SFTP_DIR ? ' (from SFTP_DIR)' : ' (from SFTP_REMOTE_PATH)'));
  
  return true;
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    logger.info('Fetching new Resgrid API token...');
    
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(config.resgrid.username)}&password=${encodeURIComponent(config.resgrid.password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      logger.info('Successfully obtained new API token');
      return response.data.access_token;
    } else {
      logger.error('Failed to obtain API token. Response did not contain access_token.');
      return null;
    }
  } catch (error) {
    logger.error(`Failed to obtain API token: ${error.message}`);
    return null;
  }
}

/**
 * Fetch calls from the API
 * @param {string} token - API token
 * @returns {Promise<Array>} List of calls
 */
async function fetchCalls(token) {
  logger.info(`Fetching calls from last ${days} days...`);
  
  try {
    // Try using GetCallsInDateRange endpoint (confirmed working)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates for API - use full ISO strings
    const startDateStr = startDate.toISOString();
    const endDateStr = endDate.toISOString();
    
    logger.info(`Date range: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCallsInDateRange', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        start: startDateStr,
        end: endDateStr
      }
    });
    
    if (Array.isArray(response.data)) {
      logger.info(`Retrieved ${response.data.length} calls from date range`);
      return response.data;
    } else {
      logger.warn('Unexpected response format from GetCallsInDateRange endpoint');
      return [];
    }
  } catch (error) {
    // Try fallback endpoint (GetActiveCalls - confirmed working)
    try {
      logger.warn(`First endpoint failed: ${error.message}, trying GetActiveCalls endpoint`);
      
      const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (Array.isArray(response.data)) {
        logger.info(`Retrieved ${response.data.length} active calls as fallback`);
        
        // Filter by date if we're using the active calls endpoint
        if (days > 0) {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          const filteredCalls = response.data.filter(call => {
            const callDate = new Date(call.LoggedOn);
            return callDate >= cutoffDate;
          });
          
          logger.info(`Filtered to ${filteredCalls.length} calls within the last ${days} days`);
          return filteredCalls;
        }
        
        return response.data;
      } else {
        logger.warn('Unexpected response format from GetActiveCalls endpoint');
        return [];
      }
    } catch (fallbackError) {
      logger.error(`Failed to fetch calls: ${fallbackError.message}`);
      return [];
    }
  }
}

/**
 * Fetch extra data for a specific call
 * @param {string} token - API token
 * @param {string} callId - Call ID
 * @returns {Promise<Object>} Call extra data
 */
async function fetchCallExtraData(token, callId) {
  try {
    // Use the confirmed working GetCallExtraData endpoint
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCallExtraData', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: { callId }
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch extra data for call ${callId}: ${error.message}`);
    return null;
  }
}

/**
 * Generates XML for ESO from call data
 */
function generateXML(callData) {
  try {
    // Create a root element
    const root = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('Import')
        .ele('Source').txt('Resgrid').up()
        .ele('Incidents');

    // Extract call details
    const callDetails = callData.Call || callData;
    const extraData = callData.ExtraData || {};
    
    // Create Incident element
    const incident = root.root().find('Incidents').ele('Incident');
    
    // Add Incident fields
    incident.ele('IncidentNumber').txt(callDetails.CallId || callDetails.Number || '');
    incident.ele('CallType').txt(callDetails.Type || callDetails.Name || '');
    incident.ele('NatureOfCall').txt(callDetails.Name || '');
    incident.ele('Priority').txt(String(callDetails.Priority || 0));
    
    // Process date fields
    const callDate = new Date(callDetails.LoggedOn || callDetails.CallTimestamp || Date.now());
    incident.ele('IncidentDate').txt(callDate.toISOString().split('T')[0]);
    incident.ele('IncidentTime').txt(callDate.toISOString().split('T')[1].substring(0, 8));
    
    // Address information
    incident.ele('IncidentStreet').txt(callDetails.Address || '');
    incident.ele('IncidentApt').txt(callDetails.Address2 || '');
    incident.ele('IncidentCity').txt(callDetails.City || '');
    incident.ele('IncidentState').txt(callDetails.State || '');
    incident.ele('IncidentZip').txt(callDetails.Zip || '');
    
    // Narrative/Notes
    incident.ele('CallNotes').txt(callDetails.Note || callDetails.Notes || '');
    
    // Extract XML as string
    return root.end({ prettyPrint: true });
  } catch (error) {
    logger.error(`Failed to generate XML: ${error.message}`);
    return null;
  }
}

/**
 * Uploads a file to ESO via SFTP
 */
async function uploadToSFTP(localFilePath, remoteFilePath) {
  const sftp = new SftpClient();
  
  try {
    logger.info(`Connecting to SFTP server at ${config.sftp.host}...`);
    
    await sftp.connect({
      host: config.sftp.host,
      port: config.sftp.port,
      username: config.sftp.username,
      password: config.sftp.password
    });
    
    // Ensure remote directory exists
    const remoteDir = path.dirname(remoteFilePath);
    const dirExists = await sftp.exists(remoteDir);
    
    if (!dirExists) {
      logger.info(`Creating remote directory: ${remoteDir}`);
      await sftp.mkdir(remoteDir, true);
    }
    
    // Upload the file
    logger.info(`Uploading file to ${remoteFilePath}...`);
    await sftp.put(localFilePath, remoteFilePath);
    
    logger.info('File uploaded successfully');
    return true;
  } catch (error) {
    logger.error(`SFTP upload failed: ${error.message}`);
    return false;
  } finally {
    sftp.end();
  }
}

/**
 * Process a single call from Resgrid
 * @param {string} token - API token
 * @param {Object} call - The basic call data
 * @returns {Promise<boolean>} Success status
 */
async function processCall(token, call) {
  try {
    const callId = call.CallId || call.Id;
    logger.info(`Processing call ${callId}...`);
    
    // Get extra data if available
    const extraData = await fetchCallExtraData(token, callId);
    
    // Create a complete call data object
    const completeCallData = {
      Call: call,
      ExtraData: extraData || {}
    };
    
    // Generate XML
    const xml = generateXML(completeCallData);
    if (!xml) {
      logger.error(`Failed to generate XML for call ${callId}`);
      return false;
    }
    
    // Log to Google Sheets if available
    try {
      if (sheetsLogger && typeof sheetsLogger.logCall === 'function') {
        await sheetsLogger.logCall(completeCallData);
      }
    } catch (sheetsError) {
      logger.warn(`Google Sheets logging failed: ${sheetsError.message}`);
    }
    
    // Save XML to local file
    const localFilePath = path.join(__dirname, `incident_${callId}.xml`);
    fs.writeFileSync(localFilePath, xml);
    
    // Upload to SFTP if configured
    if (config.sftp.host && config.sftp.username && config.sftp.password) {
      const remoteFilePath = `${config.sftp.remoteDir}/incident_${callId}.xml`;
      const success = await uploadToSFTP(localFilePath, remoteFilePath);
      
      // Remove temporary file
      fs.unlinkSync(localFilePath);
      
      return success;
    } else {
      logger.info(`SFTP not configured, XML saved to ${localFilePath}`);
      return true;
    }
  } catch (error) {
    logger.error(`Failed to process call: ${error.message}`);
    return false;
  }
}

/**
 * Main function to process all recent calls
 */
async function main() {
  try {
    // Check configuration
    if (!checkConfig()) {
      process.exit(1);
    }
    
    // Initialize Google Sheets logging if available
    try {
      if (sheetsLogger && typeof sheetsLogger.initialize === 'function') {
        await sheetsLogger.initialize();
        logger.info('Google Sheets logging initialized successfully');
      }
    } catch (sheetsError) {
      logger.warn(`Google Sheets initialization failed: ${sheetsError.message}`);
    }
    
    // Get API token
    const token = await getApiToken();
    if (!token) {
      logger.error('Failed to obtain API token, aborting.');
      process.exit(1);
    }
    
    // Fetch calls
    const calls = await fetchCalls(token);
    
    if (calls.length === 0) {
      logger.info('No calls found for processing');
      return;
    }
    
    logger.info(`Processing ${calls.length} calls...`);
    
    // Process each call
    let successCount = 0;
    for (const call of calls) {
      const success = await processCall(token, call);
      if (success) {
        successCount++;
      }
    }
    
    logger.info(`Completed processing. Success: ${successCount}/${calls.length} calls.`);
  } catch (error) {
    logger.error(`Failed to process calls: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();