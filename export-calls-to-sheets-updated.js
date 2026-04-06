/**
 * Resgrid to Google Sheets Export Utility (Updated)
 * 
 * This script fetches active or recent calls from Resgrid API
 * and logs them to Google Sheets using the standardized field mappings.
 * See FIELD_MAPPING_REFERENCE.md for details on field mappings.
 * 
 * Usage:
 *   node export-calls-to-sheets-updated.js [--active] [--days=N]
 *   --active: Export only active calls (default: false)
 *   --days=N: Look back N days for recent calls (default: 7, ignored if --active is set)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');
const winston = require('winston');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a custom logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(info => `${info.timestamp} [${info.level}]: ${info.message}`)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'sheets-export.log'),
      maxsize: 5242880
    })
  ]
});

// Parse command line arguments
const args = process.argv.slice(2);
const activeArg = args.includes('--active');
const daysArg = args.find(arg => arg.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

// Google Sheets configuration
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const SPREADSHEET_ID = process.env.LOG_SHEET_ID;

// Headers exactly as defined in the Google Sheet
const SHEET_HEADERS = [
  'Timestamp',
  'Call ID',
  'Call Type',
  'Nature',
  'Note',
  'Address',
  'City',
  'State',
  'Zip',
  'Priority',
  'Response Mode',
  'Unit Name/Unit ID',
  'En Route Time',
  'On Scene Time',
  'At Patient Time',
  'Cleared Time'
];

// API token management
let apiToken = null;

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  try {
    logger.info('Fetching new Resgrid API token...');
    
    const RESGRID_USER = process.env.RESGRID_USER;
    const RESGRID_PASS = process.env.RESGRID_PASS;
    
    if (!RESGRID_USER || !RESGRID_PASS) {
      throw new Error('Resgrid credentials not found in environment variables');
    }
    
    const tokenResponse = await axios.post(
      'https://api.resgrid.com/api/v4/Connect/token',
      `grant_type=password&username=${encodeURIComponent(RESGRID_USER)}&password=${encodeURIComponent(RESGRID_PASS)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    apiToken = tokenResponse.data.access_token;
    logger.info('Successfully obtained new API token');
    
    return apiToken;
  } catch (error) {
    logger.error(`Error getting API token: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Initialize Google Sheets API authorization
 */
async function initGoogleAuth() {
  try {
    // Try multiple methods to get credentials
    let credentials = null;
    
    // Method 1: Service account file
    const possibleFiles = [
      'service-account.json',
      'google-service-account-key.json',
      'google-service-account.json'
    ];
    
    for (const file of possibleFiles) {
      if (fs.existsSync(file)) {
        try {
          const contents = fs.readFileSync(file, 'utf8');
          credentials = JSON.parse(contents);
          logger.info(`Using credentials from file: ${file}`);
          break;
        } catch (e) {
          logger.warn(`Failed to parse ${file}: ${e.message}`);
        }
      }
    }
    
    // Method 2: Direct JSON in environment variable
    if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        logger.info('Using direct JSON credentials from environment variable');
      } catch (e) {
        logger.info('Environment variable is not directly JSON, trying base64 decode...');
      }
    }
    
    // Method 3: Base64 encoded JSON in environment variable
    if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
        logger.info('Using base64-decoded credentials from environment variable');
      } catch (e) {
        logger.warn('Failed to decode base64 credentials');
      }
    }
    
    if (!credentials) {
      throw new Error('Could not load Google service account credentials from any source');
    }
    
    // Create JWT client using credentials
    const { client_email, private_key } = credentials;
    const jwtClient = new google.auth.JWT(
      client_email,
      null,
      private_key,
      SCOPES
    );
    
    // Authorize the client
    await jwtClient.authorize();
    logger.info('Successfully initialized Google Sheets auth');
    
    return jwtClient;
  } catch (error) {
    logger.error(`Google Sheets auth initialization failed: ${error.message}`);
    throw error;
  }
}

/**
 * Fetch active calls from Resgrid API
 */
async function fetchActiveCalls(token) {
  try {
    logger.info('Fetching active calls');
    
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.data && response.data.Data) {
      logger.info(`Found ${response.data.Data.length} active calls`);
      return response.data.Data;
    } else {
      logger.warn('No active calls found or unexpected response format');
      return [];
    }
  } catch (error) {
    logger.error(`Error fetching active calls: ${error.message}`);
    return [];
  }
}

/**
 * Fetch recent calls from Resgrid API
 */
async function fetchRecentCalls(token, days) {
  try {
    logger.info(`Fetching calls from the last ${days} days`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates for API
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    logger.info(`Date range: ${startDateStr} to ${endDateStr}`);
    
    // Try GetCalls with date parameters
    try {
      const response = await axios.get(
        `https://api.resgrid.com/api/v4/Calls/GetCalls?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`,
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
        logger.info(`Retrieved ${response.data.Data.length} calls from date range`);
        return response.data.Data;
      } else {
        logger.warn('Unexpected response format from GetCalls endpoint');
      }
    } catch (error) {
      logger.warn(`Failed with GetCalls date range: ${error.message}`);
    }
    
    // If we get here, first attempt failed, try active calls as fallback
    logger.info('Trying fallback to active calls');
    return await fetchActiveCalls(token);
  } catch (error) {
    logger.error(`Error fetching recent calls: ${error.message}`);
    return [];
  }
}

/**
 * Get detailed call data
 */
async function getCallExtraData(token, callId) {
  try {
    logger.info(`Fetching extra data for call ${callId}`);
    
    const response = await axios.get(
      `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.data && response.data.Data) {
      return response.data.Data;
    } else {
      logger.warn(`No extra data found for call ${callId}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error fetching call extra data: ${error.message}`);
    return null;
  }
}

/**
 * Log a call to Google Sheets
 */
async function logCallToSheet(auth, callData) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('LOG_SHEET_ID environment variable not set');
    }
    
    // Format data for the row
    const values = [
      callData.Timestamp || new Date().toISOString(),
      callData.CallId || '',
      callData.CallType || '',
      callData.Nature || '',
      callData.Notes || '',
      callData.Address || '',
      '', // City (not available in this data)
      '', // State (not available in this data)
      '', // Zip (not available in this data)
      callData.Priority || '',
      callData.ResponseMode || '390',
      callData.UnitsCsv || '',
      callData.EnRouteTime || '',
      callData.ArrivedTime || '',
      callData.AtPatientTime || '',
      callData.ClearedTime || ''
    ];
    
    // Get sheets API instance
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Append data to the sheet
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Sheet1!A1:P1', // Match the headers length
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values: [values]
      }
    });
    
    logger.info(`Row added to Google Sheet: ${result.data.updates.updatedRange}`);
    return true;
  } catch (error) {
    logger.error(`Failed to log call to Google Sheets: ${error.message}`);
    if (error.response && error.response.data) {
      logger.error(`API error: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

/**
 * Process a single call and log to Google Sheets
 */
async function processCall(token, auth, call) {
  try {
    logger.info(`Processing call ${call.CallId}: ${call.Name}`);
    
    // Get extra data
    const extraData = await getCallExtraData(token, call.CallId);
    
    // Extract call type if available
    let callType = '';
    if (extraData && extraData.Type && extraData.Type.Name) {
      callType = extraData.Type.Name;
    }
    
    // Extract units from dispatches
    let units = '';
    if (extraData && extraData.Dispatches && extraData.Dispatches.length > 0) {
      const unitNames = extraData.Dispatches
        .filter(d => d.Type === 'Unit')
        .map(d => d.Name);
      
      if (unitNames.length > 0) {
        units = unitNames.join(',');
      } else {
        units = extraData.Dispatches[0].Name;
      }
    }
    
    // Determine response mode based on priority
    let responseMode = '390'; // Default to Hot (Emergency)
    if (call.Priority === 3 || (extraData && extraData.Priority && extraData.Priority.Id === '3')) {
      responseMode = '690'; // Cold (Non-emergency)
    }
    
    // Extract timestamps - based on status mapping
    let unitEnRouteTime = '';
    let unitArrivedTime = '';
    let unitAtPatientTime = '';
    let unitClearedTime = '';
    
    if (extraData && extraData.Activity && extraData.Activity.length > 0) {
      for (const activity of extraData.Activity) {
        // Map status IDs to timestamp fields
        switch (parseInt(activity.StatusId)) {
          case 5: // En Route / Responding
            unitEnRouteTime = activity.Timestamp;
            break;
          case 6: // On Scene
            unitArrivedTime = activity.Timestamp;
            break;
          case 3: // Committed / At Patient
            unitAtPatientTime = activity.Timestamp;
            break;
          case 0: // Available
          case 2: // Available
          case 8: // Returning
            unitClearedTime = activity.Timestamp;
            break;
        }
      }
    }
    
    // Build complete data for sheet logging - matches FIELD_MAPPING_REFERENCE.md
    const callData = {
      Timestamp: call.LoggedOn,
      CallId: call.CallId,
      CallType: callType,
      Nature: call.Name || '',
      Notes: call.Note || '',
      Address: call.Address || '',
      Priority: call.Priority || (extraData && extraData.Priority ? extraData.Priority.Name : ''),
      ResponseMode: responseMode,
      UnitsCsv: units,
      EnRouteTime: unitEnRouteTime,
      ArrivedTime: unitArrivedTime,
      AtPatientTime: unitAtPatientTime,
      ClearedTime: unitClearedTime
    };
    
    // Log to Google Sheets
    await logCallToSheet(auth, callData);
    logger.info(`Successfully logged call ${call.CallId} to Google Sheets`);
    
    return true;
  } catch (error) {
    logger.error(`Error processing call ${call.CallId}: ${error.message}`);
    return false;
  }
}

/**
 * Main function to export calls to Google Sheets
 */
async function main() {
  try {
    logger.info(`Starting Google Sheets export utility`);
    logger.info(`Mode: ${activeArg ? 'Active calls only' : `Last ${days} days`}`);
    
    // Get API token
    const token = await getApiToken();
    
    // Initialize Google Sheets auth
    const auth = await initGoogleAuth();
    
    // Get calls based on mode
    const calls = activeArg ? 
      await fetchActiveCalls(token) : 
      await fetchRecentCalls(token, days);
    
    if (!calls || calls.length === 0) {
      logger.info('No calls found to export');
      return;
    }
    
    logger.info(`Found ${calls.length} calls to process`);
    
    // Process each call
    let successCount = 0;
    let failCount = 0;
    
    for (const call of calls) {
      const success = await processCall(token, auth, call);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
    }
    
    logger.info(`Export complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    logger.error(`Export failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();