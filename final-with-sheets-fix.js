/**
 * Resgrid to ESO Bridge - Final Fix with Google Sheets Integration
 * 
 * This script fetches calls from Resgrid API using confirmed working endpoints,
 * generates XML for each, uploads them to ESO via SFTP, and logs to Google Sheets.
 * 
 * Usage:
 *   node final-with-sheets-fix.js [--days=N]
 *   where N is the number of days to look back (default: 7)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const SftpClient = require('ssh2-sftp-client');
const { create } = require('xmlbuilder2');
const { google } = require('googleapis');

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
  },
  sheets: {
    sheetId: process.env.LOG_SHEET_ID,
    serviceAccountKeyB64: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_B64,
    serviceAccountJson: process.env.GOOGLE_SERVICE_ACCOUNT_JSON,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  }
};

// Google Sheets setup
let sheetsAuth = null;
let sheetsClient = null;
const sheets = google.sheets('v4');

/**
 * Initialize Google Sheets
 */
async function initializeSheets() {
  try {
    if (!config.sheets.sheetId) {
      console.log('Google Sheets logging disabled (no LOG_SHEET_ID)');
      return false;
    }
    
    if (config.sheets.serviceAccountKeyB64) {
      const keyJson = JSON.parse(
        Buffer.from(config.sheets.serviceAccountKeyB64, 'base64').toString('utf8')
      );
      
      sheetsAuth = new google.auth.GoogleAuth({
        credentials: keyJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      log('Using base64 encoded Google service account key');
    } 
    else if (config.sheets.serviceAccountJson) {
      const keyJson = JSON.parse(config.sheets.serviceAccountJson);
      
      sheetsAuth = new google.auth.GoogleAuth({
        credentials: keyJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      log('Using JSON string Google service account key');
    }
    else if (config.sheets.serviceAccountKeyPath) {
      try {
        const keyJson = JSON.parse(fs.readFileSync(config.sheets.serviceAccountKeyPath, 'utf8'));
        
        sheetsAuth = new google.auth.GoogleAuth({
          credentials: keyJson,
          scopes: ['https://www.googleapis.com/auth/spreadsheets']
        });
        
        log('Using Google service account key from file path: ' + config.sheets.serviceAccountKeyPath);
      } catch (fileError) {
        log(`Failed to read service account key file: ${fileError.message}`, true);
        return false;
      }
    }
    else {
      log('No Google Sheets credentials found, logging disabled');
      return false;
    }
    
    sheetsClient = await sheetsAuth.getClient();
    log('Google Sheets authentication successful');
    return true;
  } catch (error) {
    log(`Error initializing Google Sheets: ${error.message}`, true);
    return false;
  }
}

/**
 * Log a message to console and Google Sheets
 */
async function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  (isError ? console.error : console.log)(`[${timestamp}] ${message}`);
  
  // Also log to Google Sheets if available
  try {
    if (sheetsClient && config.sheets.sheetId) {
      await sheets.spreadsheets.values.append({
        auth: sheetsClient,
        spreadsheetId: config.sheets.sheetId,
        range: 'Logs!A:C',
        valueInputOption: 'USER_ENTERED',
        requestBody: { 
          values: [[ 
            timestamp, 
            isError ? 'ERROR' : 'INFO', 
            message 
          ]] 
        }
      });
    }
  } catch (err) {
    console.error(`Google Sheets log error: ${err.message}`);
  }
}

/**
 * Log call data to Google Sheets
 * @param {Object} call - The call data
 * @param {Array} activity - The activity data array
 * @param {Array} dispatches - The dispatches data array (optional)
 */
async function logCallData(call, activity, dispatches = []) {
  try {
    if (!sheetsClient || !config.sheets.sheetId) {
      return;
    }
    
    // Process activity data to extract status events
    // Get unit names from activity data
    const activityUnits = activity
      .filter(a => a.Type === 'Unit')
      .map(a => a.Name);
    
    // Get unit names from call.Dispatches if available - this array contains the assigned units
    const dispatchUnits = [];
    if (call.Dispatches && Array.isArray(call.Dispatches)) {
      call.Dispatches.forEach(dispatch => {
        if (dispatch.Type === 'Unit' && dispatch.Name) {
          dispatchUnits.push(dispatch.Name);
        }
      });
    }
    
    // Combine units from both sources and deduplicate
    const allUnits = [...activityUnits, ...dispatchUnits];
    const uniqueUnits = [...new Set(allUnits)];
    
    // Check if we have units from either source
    const unitsCsv = uniqueUnits.length > 0 ? uniqueUnits.join(', ') : 'No Units';
    
    // Log for debugging
    log(`Units for call ${call.CallId}: Activity units=[${activityUnits}], Dispatch units=[${dispatchUnits}], Combined=[${unitsCsv}]`);
      
    // Use StatusId values directly
    const enRouteEvent = activityEvent(activity, 5);      // En Route (StatusId = 5)
    const onSceneEvent = activityEvent(activity, 6);      // On Scene (StatusId = 6)
    const atPatientEvent = activityEvent(activity, 3);    // At Patient/Committed (StatusId = 3)
    const clearedEvent = activityEvent(activity, 8);      // Cleared (StatusId = 8)
    const returningEvent = activityEvent(activity, 9);    // Returning (StatusId = 9)
    const availableEvent = activityEvent(activity, 2);    // Available (StatusId = 2)
    
    // Use the first available status for back in service (returning or available)
    const backInServiceEvent = returningEvent.Timestamp ? returningEvent : availableEvent;
    
    // Get timestamps exactly like generateXML does
    const enRouteTime = enRouteEvent.Timestamp || '';
    const onSceneTime = onSceneEvent.Timestamp || '';
    // Use On Scene as fallback for At Patient if committed status not found
    const atPatientTime = atPatientEvent.Timestamp || onSceneEvent.Timestamp || '';
    const clearedTime = clearedEvent.Timestamp || call.ClosedOn || '';
    const backInServiceTime = backInServiceEvent.Timestamp || '';
    
    // Get unit location
    const unitLocation = (enRouteEvent.Location || onSceneEvent.Location || '').trim();
    
    // Parse address components
    const addressStr = (call.Address || '').replace(/[\r\n]/g, '').trim();
    const addressMatch = /^(.*?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})(?:.*)?$/i.exec(addressStr);
    const address = addressMatch ? addressMatch[1] : addressStr;
    const city = addressMatch ? addressMatch[2] : '';
    const state = addressMatch ? addressMatch[3] : '';
    const zip = addressMatch ? addressMatch[4] : '';
    
    // Extract coordinates
    const [latitude, longitude] = (call.Geolocation || '').split(',').map(c => c ? c.trim() : '');
    
    // Parse contact name (if exists)
    let firstName = '';
    let lastName = '';
    if (call.ContactName) {
      const nameParts = call.ContactName.trim().split(' ');
      if (nameParts.length >= 1) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      }
    }
    
    // Fix response mode - check if nature includes "Non-Emergency" or other keywords
    let responseMode = '395'; // Default to emergency (395)
    if (call.Nature && /non.?emergency|non.?urgent|routine|scheduled/i.test(stripTags(call.Nature))) {
      responseMode = '390'; // Non-emergency (390)
    }
    // Also check by Priority field
    if (call.Priority === '1559') {
      responseMode = '390'; // Non-emergency (390)
    }
    
    // Add last updated timestamp
    const lastUpdated = new Date().toISOString();
    
    // Prepare row data matching exact column order of "Call Data" sheet
    const rowData = [
      call.LoggedOn,                      // Timestamp
      call.CallId,                        // Call ID
      call.Type,                          // Call Type
      stripTags(call.Nature || ''),       // Nature
      stripTags(call.Note || ''),         // Note
      address,                            // Address
      city,                               // City
      state,                              // State
      zip,                                // Zip
      '',                                 // Priority (dropped as requested)
      responseMode,                       // Response Mode (properly determined)
      unitsCsv,                           // Unit Name
      unitLocation,                       // Unit Location
      enRouteTime,                        // En Route Time
      onSceneTime,                        // Arrived Time
      atPatientTime,                      // At Patient Time
      clearedTime,                        // Cleared Time
      backInServiceTime,                  // Back In Service Time
      latitude || '',                     // Latitude
      longitude || '',                    // Longitude
      firstName,                          // Patient First Name (from ContactName)
      lastName,                           // Patient Last Name (from ContactName)
      call.ContactInfo || '',             // Contact Info
      call.ExternalId || '',              // Patient DOB (using ExternalId field)
      call.Number || '',                  // CAD # (added as a new column)
      lastUpdated                         // Last Updated timestamp
    ];
    
    try {
      // First check if this call already exists in the sheet
      const response = await sheets.spreadsheets.values.get({
        auth: sheetsClient,
        spreadsheetId: config.sheets.sheetId,
        range: 'Call Data!A:B'  // Get the first two columns to find CallId
      });
      
      const rows = response.data.values || [];
      let existingRowIndex = -1;
      
      // Find the row with this call ID (skip the header row)
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][1] === call.CallId) {
          existingRowIndex = i;
          break;
        }
      }
      
      if (existingRowIndex > 0) {
        // Call exists, update the existing row
        await sheets.spreadsheets.values.update({
          auth: sheetsClient,
          spreadsheetId: config.sheets.sheetId,
          range: `Call Data!A${existingRowIndex + 1}:Z${existingRowIndex + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: { values: [rowData] }
        });
        
        log(`Updated existing call ${call.CallId} in Google Sheets at row ${existingRowIndex + 1}`);
      } else {
        // Call doesn't exist, append a new row
        await sheets.spreadsheets.values.append({
          auth: sheetsClient,
          spreadsheetId: config.sheets.sheetId,
          range: 'Call Data!A:Z',  // Extended range to include Last Updated column
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: [rowData] }
        });
        
        log(`Added new call ${call.CallId} to Google Sheets`);
      }
    } catch (error) {
      log(`Error updating/checking Google Sheets: ${error.message}`, true);
      
      // Fallback to simple append if the check/update fails
      await sheets.spreadsheets.values.append({
        auth: sheetsClient,
        spreadsheetId: config.sheets.sheetId,
        range: 'Call Data!A:Z',  // Extended range to include Last Updated column
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [rowData] }
      });
      
      log(`Call ${call.CallId} logged to Google Sheets (fallback method)`);
    }
  } catch (error) {
    log(`Error logging call to Google Sheets: ${error.message}`, true);
  }
}

// Verify required configuration
function checkConfig() {
  // Check Resgrid credentials
  if (!config.resgrid.username || !config.resgrid.password) {
    log('Missing Resgrid credentials. Set RESGRID_USER and RESGRID_PASS environment variables.', true);
    return false;
  }
  
  // Log configuration
  console.log('Environment configuration:');
  console.log('  RESGRID_USER: ' + (config.resgrid.username ? '✓ Set' : '❌ Missing'));
  console.log('  RESGRID_PASS: ' + (config.resgrid.password ? '✓ Set' : '❌ Missing'));
  console.log('  SFTP_HOST: ' + config.sftp.host);
  console.log('  SFTP_USER: ' + config.sftp.username);
  console.log('  SFTP_DIR: ' + config.sftp.remoteDir);
  console.log('  LOG_SHEET_ID: ' + (config.sheets.sheetId ? '✓ Set' : '❌ Missing'));
  console.log('  GOOGLE_SERVICE_ACCOUNT: ' + (config.sheets.serviceAccountKeyB64 || config.sheets.serviceAccountJson || config.sheets.serviceAccountKeyPath ? '✓ Set' : '❌ Missing'));
  
  return true;
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching new Resgrid API token...');
    
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
      log('Successfully obtained new API token');
      return response.data.access_token;
    } else {
      log('Failed to obtain API token. Response did not contain access_token.', true);
      return null;
    }
  } catch (error) {
    log(`Failed to obtain API token: ${error.message}`, true);
    return null;
  }
}

/**
 * Fetch calls from the API using the structure from the working script
 * @param {string} token - API token
 * @returns {Promise<Array>} List of calls
 */
async function fetchCalls(token) {
  log(`Fetching calls from last ${days} days...`);
  
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
      log(`Retrieved ${allCalls.length} active calls`);
      
      // Filter by date if we're using active calls (from the working script)
      if (days > 0) {
        const cutoff = Date.now() - days * 86400000; // 864e5 in the working script
        const filteredCalls = allCalls.filter(call => new Date(call.LoggedOn) >= cutoff);
        
        log(`Filtered to ${filteredCalls.length} calls within the last ${days} days`);
        return filteredCalls;
      }
      
      return allCalls;
    } else {
      log(`Unexpected response format from GetActiveCalls endpoint`, true);
      return [];
    }
  } catch (error) {
    log(`Failed to fetch calls: ${error.message}`, true);
    return [];
  }
}

/**
 * Fetch extra data for a specific call using the structure from the working script
 * @param {string} token - API token
 * @param {string} callId - Call ID
 * @returns {Promise<Object>} Call extra data and dispatch info
 */
async function fetchCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    
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
    
    // Check response structure
    if (response.data && response.data.Data) {
      log(`Successfully retrieved extra data for call ${callId}`);
      
      const result = {
        activity: Array.isArray(response.data.Data.Activity) ? response.data.Data.Activity : [],
        dispatches: Array.isArray(response.data.Data.Dispatches) ? response.data.Data.Dispatches : []
      };
      
      // Log what we found
      log(`Found ${result.activity.length} activity entries and ${result.dispatches.length} dispatch entries for call ${callId}`);
      
      // Debug unit dispatches if any exist
      const unitDispatches = result.dispatches.filter(d => d.Type === 'Unit');
      if (unitDispatches.length > 0) {
        log(`Found ${unitDispatches.length} unit dispatches: ${unitDispatches.map(u => u.Name).join(', ')}`);
      } else {
        log(`No unit dispatches found in Dispatches array`);
      }
      
      return result;
    } else {
      log(`Extra data for call ${callId} has unexpected format`, true);
      return { activity: [], dispatches: [] };
    }
  } catch (error) {
    log(`Failed to fetch extra data for call ${callId}: ${error.message}`, true);
    return { activity: [], dispatches: [] };
  }
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
 * Find an activity event by StatusId or matching a regex pattern
 * @param {Array} act - Activity array
 * @param {RegExp|number} statusIdOrRegex - StatusId number or regex pattern to match
 * @returns {Object} Matching activity event or empty object
 */
function activityEvent(act, statusIdOrRegex) {
  if (typeof statusIdOrRegex === 'number') {
    // Find by StatusId (preferred method)
    return act.find(e => e.StatusId === statusIdOrRegex) || {};
  } else {
    // Fallback to regex matching on text fields
    return act.find(e => statusIdOrRegex.test(e.StatusText || e.Type || e.Note || '')) || {};
  }
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
    
    // Derive timestamps using StatusId values directly
    const enRouteEvt = activityEvent(activity, 5);  // En Route (StatusId = 5)
    const onSceneEvt = activityEvent(activity, 6);  // On Scene (StatusId = 6)
    const atPatientEvt = activityEvent(activity, 3); // At Patient/Committed (StatusId = 3)
    const clearedEvt = activityEvent(activity, 8);  // Cleared (StatusId = 8)
    const returningEvt = activityEvent(activity, 9); // Returning (StatusId = 9)
    const availableEvt = activityEvent(activity, 2); // Available (StatusId = 2)
    
    // Extract timestamps from events with improved fallback logic
    const enRoute = enRouteEvt.Timestamp || '';
    const onScene = onSceneEvt.Timestamp || '';
    const atPatient = atPatientEvt.Timestamp || onSceneEvt.Timestamp || '';
    
    // For cleared status:
    // 1. Try StatusId 8 (Cleared)
    // 2. If not found, try StatusId 9 (Returning) or StatusId 2 (Available)
    // 3. Fall back to call.ClosedOn
    const cleared = clearedEvt.Timestamp || returningEvt.Timestamp || availableEvt.Timestamp || call.ClosedOn || '';
    
    // For back in service:
    // 1. Try StatusId 9 (Returning)
    // 2. Try StatusId 2 (Available)
    // 3. If neither found, try StatusId 8 (Cleared) - they could use same status
    const backInService = returningEvt.Timestamp || availableEvt.Timestamp || clearedEvt.Timestamp || '';
    
    // Use events for location data
    const dispEvt = enRouteEvt.Timestamp ? enRouteEvt : onSceneEvt;
    const sceneEvt = onSceneEvt.Timestamp ? onSceneEvt : dispEvt;
    
    // Coordinates from different sources
    const [lat0, lng0] = (call.Geolocation || '').split(',');
    const [dLat, dLng] = safeCoords(dispEvt);
    const [sLat, sLng] = safeCoords(sceneEvt);
    
    // Patient information
    const contactName = call.ContactName || '';
    let firstName = '';
    let lastName = '';
    
    if (contactName) {
      const nameParts = contactName.trim().split(' ');
      if (nameParts.length >= 2) {
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        firstName = nameParts[0];
      }
    }
    
    // Get unit names from activity and dispatches
    const activityUnits = activity
      .filter(a => a.Type === 'Unit')
      .map(a => a.Name);
      
    // Get unit names from call.Dispatches if available
    const dispatchUnits = [];
    if (call.Dispatches && Array.isArray(call.Dispatches)) {
      call.Dispatches.forEach(dispatch => {
        if (dispatch.Type === 'Unit' && dispatch.Name) {
          dispatchUnits.push(dispatch.Name);
        }
      });
    }
    
    // Combine units from both sources and deduplicate
    const allUnits = [...activityUnits, ...dispatchUnits];
    const uniqueUnitNames = [...new Set(allUnits)];
    
    // Check if we have units from either source
    const unitsCsv = uniqueUnitNames.length > 0 ? uniqueUnitNames.join(', ') : 'No Units';
    
    // Log for debugging
    log(`Units for call ${call.CallId} XML generation: Activity units=[${activityUnits}], Dispatch units=[${dispatchUnits}], Combined=[${unitsCsv}]`);
    
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
        .ele('UnitBackInService').txt(backInService).up()
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
        .ele('PatientFirstName').txt(firstName || '').up()
        .ele('PatientLastName').txt(lastName || '').up()
        .ele('PatientPhone').txt(call.ContactInfo || '').up()
        .ele('PatientDOB').txt(call.ExternalId || '')
      .doc()
      .end({ prettyPrint: true });
  } catch (error) {
    log(`Failed to generate XML: ${error.message}`, true);
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
      log(`SFTP attempt ${i}...`);
      
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
        log(`Creating remote directory: ${remoteDir}`);
        await sftp.mkdir(remoteDir, true);
      }
      
      // Upload the file
      log(`Uploading file to ${remoteFilePath}...`);
      await sftp.put(localFilePath, remoteFilePath);
      
      log('File uploaded successfully');
      await sftp.end();
      return true;
    } catch (error) {
      log(`SFTP attempt ${i} failed: ${error.message}`, true);
      
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
    log(`Processing call ${callId}...`);
    
    // Get activity and dispatches data
    const extraData = await fetchCallExtraData(token, callId);
    const { activity, dispatches } = extraData;
    
    // Store dispatches in the call object for access in other functions
    call.Dispatches = dispatches;
    
    // Debug log to check activity data
    log(`Activity data for call ${callId}:`);
    if (activity && activity.length > 0) {
      log(`Found ${activity.length} activity records`);
      activity.forEach((act, i) => {
        log(`Activity ${i}: Type=${act.Type}, StatusId=${act.StatusId}, StatusText=${act.StatusText}, Timestamp=${act.Timestamp}`);
      });
    } else {
      log(`No activity data found for call ${callId}`, true);
    }
    
    // Generate XML
    const xml = generateXML(call, activity);
    if (!xml) {
      log(`Failed to generate XML for call ${callId}`, true);
      return false;
    }
    
    log(`Generated XML (${xml.length} bytes)`);
    
    // Save XML to local file
    const localFilePath = path.join(__dirname, `incident_${callId}.xml`);
    fs.writeFileSync(localFilePath, xml);
    
    // Log to Google Sheets
    try {
      await logCallData(call, activity, dispatches);
    } catch (sheetsError) {
      log(`Google Sheets logging failed: ${sheetsError.message}`, true);
    }
    
    // Upload to SFTP if configured
    if (config.sftp.host && config.sftp.username && config.sftp.password) {
      const remoteFilePath = `${config.sftp.remoteDir}/incident_${callId}.xml`;
      try {
        await uploadToSFTP(localFilePath, remoteFilePath);
        log(`SFTP upload successful for call ${callId}`);
      } catch (sftpError) {
        log(`SFTP upload failed: ${sftpError.message}`, true);
      }
      
      // Remove temporary file
      fs.unlinkSync(localFilePath);
    } else {
      log(`SFTP not configured, XML saved to ${localFilePath}`);
    }
    
    return true;
  } catch (error) {
    log(`Failed to process call: ${error.message}`, true);
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
    
    // Initialize Google Sheets logging
    await initializeSheets();
    
    // Get API token
    const token = await getApiToken();
    if (!token) {
      log('Failed to obtain API token, aborting.', true);
      process.exit(1);
    }
    
    // Fetch calls
    const calls = await fetchCalls(token);
    
    if (calls.length === 0) {
      log('No calls found for processing');
      return;
    }
    
    log(`Processing ${calls.length} calls...`);
    
    // Process each call
    let successCount = 0;
    for (const call of calls) {
      const success = await processCall(token, call);
      if (success) {
        successCount++;
      }
    }
    
    log(`Completed processing. Success: ${successCount}/${calls.length} calls.`);
  } catch (error) {
    log(`Failed to process calls: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the main function
main();