/**
 * Resgrid to ESO Bridge - Fetch Existing Calls Utility (Working Version)
 * 
 * This script fetches existing calls from Resgrid API using confirmed working endpoints,
 * generates XML for each, and uploads them to ESO via SFTP.
 * 
 * Usage:
 *   node fixed-with-working-endpoints.js [--days=N]
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
    
    const params = new URLSearchParams({
      grant_type: 'password',
      username: config.resgrid.username,
      password: config.resgrid.password
    });
    
    const response = await axios.post(
      'https://api.resgrid.com/api/v4/Connect/token',
      params,
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
 * Fetch calls from the API using the structure from the working script
 * @param {string} token - API token
 * @returns {Promise<Array>} List of calls
 */
async function fetchCalls(token) {
  logger.info(`Fetching calls from last ${days} days...`);
  
  try {
    // Using the exact endpoint structure from the working script
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      { 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      }
    );
    
    // From the working script: r.data.Data || []
    if (response.data && Array.isArray(response.data.Data)) {
      const allCalls = response.data.Data;
      logger.info(`Retrieved ${allCalls.length} active calls`);
      
      // Filter by date if we're using active calls (from the working script)
      if (days > 0) {
        const cutoff = Date.now() - days * 86400000; // 864e5 in the working script
        const filteredCalls = allCalls.filter(call => new Date(call.LoggedOn) >= cutoff);
        
        logger.info(`Filtered to ${filteredCalls.length} calls within the last ${days} days`);
        return filteredCalls;
      }
      
      return allCalls;
    } else {
      logger.warn(`Unexpected response format from GetActiveCalls endpoint`);
      return [];
    }
  } catch (error) {
    logger.error(`Failed to fetch calls: ${error.message}`);
    return [];
  }
}

/**
 * Fetch extra data for a specific call using the structure from the working script
 * @param {string} token - API token
 * @param {string} callId - Call ID
 * @returns {Promise<Object>} Call extra data
 */
async function fetchCallExtraData(token, callId) {
  try {
    logger.info(`Fetching extra data for call ${callId}...`);
    
    // Using the exact endpoint structure from the working script
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetCallExtraData',
      { 
        params: { callId }, 
        headers: { 
          Authorization: `Bearer ${token}` 
        } 
      }
    );
    
    // From the working script: r.data.Data?.Activity || []
    if (response.data && response.data.Data && Array.isArray(response.data.Data.Activity)) {
      logger.info(`Successfully retrieved extra data for call ${callId}`);
      return response.data.Data.Activity;
    } else {
      logger.warn(`Extra data for call ${callId} doesn't contain expected Activity array`);
      return [];
    }
  } catch (error) {
    logger.error(`Failed to fetch extra data for call ${callId}: ${error.message}`);
    return [];
  }
}

/**
 * Formats timestamps for the XML
 * @param {string} timestamp - ISO timestamp
 * @returns {string} Formatted timestamp
 */
function formatTimestamp(timestamp) {
  return timestamp || '';
}

/**
 * Parses an address string into components
 * @param {string} addr - Address string
 * @returns {Object} Address components
 */
function parseAddress(addr = '') {
  const clean = addr.replace(/[\r\n]/g, '').trim();
  const m = /^(.*?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})(?:.*)?$/i.exec(clean);
  return m
    ? { a1: m[1], city: m[2], state: m[3], zip: m[4] }
    : { a1: clean, city: '', state: '', zip: '' };
}

/**
 * Strip HTML tags from a string
 * @param {string} html - HTML string
 * @returns {string} Plain text string
 */
function stripTags(html) {
  return (html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Find an activity event matching a regex
 * @param {Array} act - Activity array
 * @param {RegExp} regex - Regular expression to match
 * @returns {Object} Matching activity event or empty object
 */
function activityEvent(act, regex) {
  return act.find(e => regex.test(e.StatusText || e.Type || e.Note || '')) || {};
}

/**
 * Extracts safe coordinates from an object
 * @param {Object} o - Object with Latitude and Longitude properties
 * @returns {Array} Array with [latitude, longitude]
 */
function safeCoords(o) {
  return [o?.Latitude || '', o?.Longitude || ''];
}

/**
 * Generates XML for ESO from call data, using the schema from the working script
 * @param {Object} call - Call data
 * @param {Array} activity - Call activity array
 * @returns {string} XML string
 */
function generateXML(call, activity) {
  try {
    // Priority mapping from the working script
    const priorityMap = { '1560': '390', '1559': '395' };
    
    // Derive timestamps & coords from the working script
    const enRoute = activityEvent(activity, /en.?route/i).Timestamp || '';
    const onScene = activityEvent(activity, /on.?scene/i).Timestamp || '';
    const atPatient = activityEvent(activity, /patient/i).Timestamp || '';
    const cleared = activityEvent(activity, /cleared/i).Timestamp || call.ClosedOn || '';
    const dispEvt = activityEvent(activity, /dispatched|en.?route/i);
    const sceneEvt = activityEvent(activity, /on.?scene/i);
    
    // Coordinates from different sources
    const [lat0, lng0] = (call.Geolocation || '').split(',');
    const [dLat, dLng] = safeCoords(dispEvt);
    const [sLat, sLng] = safeCoords(sceneEvt);
    
    // Get units CSV, following the working script
    const unitsCsv = activity
      .filter(a => a.Type === 'Unit')
      .map(a => a.Name)
      .join(', ') || 'No Units';
    
    // Prepare address
    const cleanAddr = (call.Address || '').replace(/[\r\n]/g, '').trim();
    const a = parseAddress(cleanAddr);
    
    // Prepare description
    const nat = stripTags(call.Nature || call.Name || '');
    const notes = stripTags(call.Note || '');
    const desc = notes ? `${nat} - ${notes}` : nat;
    
    // GUID from the working script
    const GUID = 'b394de98-a5b7-408d-a1f2-020eddff92b9';
    
    // Using the exact XML structure from the working script
    return create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt(GUID).up()
        .ele('IncidentNumber').txt(call.CallId).up()
        .ele('IncidentOrOnset').txt(call.LoggedOn).up()
        .ele('DispatchNotified').txt(call.LoggedOn).up()
        .ele('ComplaintReportedByDispatch').txt(call.Type).up()
        .ele('VehicleDispatchLocation').txt(cleanAddr).up()
        .ele('IncidentAddress1').txt(a.a1).up()
        .ele('IncidentAddress2').txt('').up()
        .ele('IncidentCity').txt(a.city).up()
        .ele('IncidentState').txt(a.state).up()
        .ele('IncidentZip').txt(a.zip).up()
        .ele('IncidentCounty').txt('').up()
        .ele('CadDispatchText').txt(nat).up()
        .ele('EmsUnitCallSign').txt(unitsCsv).up()
        .ele('UnitNotifiedByDispatch').txt(unitsCsv).up()
        .ele('Priority').txt(priorityMap[call.Priority] || '395').up()
        .ele('ResponseModeToScene').txt(priorityMap[call.Priority] || '395').up()
        .ele('CrossStreets').txt('').up()
        .ele('CallNature').txt(call.Name).up()
        .ele('CallNatureDescription').txt(desc).up()
        .ele('UnitEnRoute').txt(enRoute).up()
        .ele('UnitArrivedOnScene').txt(onScene).up()
        .ele('UnitAtPatient').txt(atPatient).up()
        .ele('UnitCleared').txt(cleared).up()
        .ele('SceneGpsLocationLat').txt(sLat || lat0 || '').up()
        .ele('SceneGpsLocationLong').txt(sLng || lng0 || '').up()
        .ele('VehicleDispatchGpsLocationLat').txt(dLat || lat0 || '').up()
        .ele('VehicleDispatchGpsLocationLong').txt(dLng || lng0 || '').up()
        .ele('CallClosedTime').txt(call.ClosedOn || '').up()
        .ele('RunNumber').txt(call.Number || '').up()
        .ele('GeoLocation')
          .ele('Latitude').txt(lat0 || '0').up()
          .ele('Longitude').txt(lng0 || '0').up()
        .up()
      .doc()
      .end({ prettyPrint: true });
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
  
  // From the working script: retry 3 times with increasing delays
  for (let i = 1; i <= 3; i++) {
    try {
      logger.info(`SFTP attempt ${i}...`);
      
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
      await sftp.end();
      return true;
    } catch (error) {
      logger.error(`SFTP attempt ${i} failed: ${error.message}`);
      
      if (i === 3) {
        throw error; // Rethrow on the final attempt
      }
      
      // Increasing delay between attempts
      await new Promise(resolve => setTimeout(resolve, i * 5000));
      
      // Make sure connection is closed before retry
      try {
        await sftp.end();
      } catch (closeError) {
        // Ignore errors on close
      }
    }
  }
  
  return false;
}

/**
 * Process a single call from Resgrid
 * @param {string} token - API token
 * @param {Object} call - The basic call data
 * @returns {Promise<boolean>} Success status
 */
async function processCall(token, call) {
  try {
    const callId = call.CallId;
    logger.info(`Processing call ${callId}...`);
    
    // Get activity data
    const activity = await fetchCallExtraData(token, callId);
    
    // Units CSV (for fingerprinting from the working script)
    const unitsCsv = activity
      .filter(a => a.Type === 'Unit')
      .map(a => a.Name)
      .join(', ') || 'No Units';
    
    // Generate XML
    const xml = generateXML(call, activity);
    if (!xml) {
      logger.error(`Failed to generate XML for call ${callId}`);
      return false;
    }
    
    logger.info(`Generated XML (${xml.length} bytes)`);
    
    // Save XML to local file
    const localFilePath = path.join(__dirname, `incident_${callId}.xml`);
    fs.writeFileSync(localFilePath, xml);
    
    // Log to Google Sheets if available
    try {
      if (sheetsLogger && typeof sheetsLogger.logCall === 'function') {
        await sheetsLogger.logCall({
          Call: call,
          Activity: activity
        });
      }
    } catch (sheetsError) {
      logger.warn(`Google Sheets logging failed: ${sheetsError.message}`);
    }
    
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