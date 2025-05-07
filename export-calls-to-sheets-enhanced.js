/**
 * Resgrid to Google Sheets Export Utility (Enhanced)
 * 
 * This script fetches active or recent calls from Resgrid API
 * and logs them to Google Sheets with enhanced field support.
 * 
 * Usage:
 *   node export-calls-to-sheets-enhanced.js [--active] [--days=N]
 *   --active: Export only active calls (default: false)
 *   --days=N: Look back N days for recent calls (default: 7, ignored if --active is set)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { google } = require('googleapis');
const winston = require('winston');
const { create } = require('xmlbuilder2');

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

// Enhanced Headers for Google Sheet - includes new fields
const SHEET_HEADERS = [
  'Timestamp',
  'Call ID',
  'Call Type',
  'XML', // XML in column D
  'Nature',
  'Note',
  'Address',
  'City',
  'State',
  'Zip',
  'Latitude',
  'Longitude',
  'Priority',
  'Response Mode',
  'Unit Name/Unit ID',
  'En Route Time',
  'On Scene Time',
  'At Patient Time',
  'Cleared Time',
  'Patient First Name',
  'Patient Last Name',
  'Patient Phone',
  'Patient DOB/ID'
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
    
    // Ensure Calls sheet exists
    await ensureCallsSheetExists(jwtClient);
    
    return jwtClient;
  } catch (error) {
    logger.error(`Google Sheets auth initialization failed: ${error.message}`);
    throw error;
  }
}

/**
 * Ensure the 'Calls' sheet exists in the spreadsheet
 */
async function ensureCallsSheetExists(auth) {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('LOG_SHEET_ID environment variable not set');
    }
    
    // Get sheets API instance
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get current sheets
    const response = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties'
    });
    
    // Check if Calls sheet exists
    const callsSheetExists = response.data.sheets.some(
      sheet => sheet.properties.title === 'Calls'
    );
    
    if (!callsSheetExists) {
      logger.info("'Calls' sheet not found, creating it now...");
      
      // Add Calls sheet
      const addSheetResponse = await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [{
            addSheet: {
              properties: {
                title: 'Calls'
              }
            }
          }]
        }
      });
      
      // Get the new sheet ID from the response
      const newSheetId = addSheetResponse.data.replies[0].addSheet.properties.sheetId;
      
      // Add headers
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Calls!A1:W1',
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [SHEET_HEADERS]
        }
      });
      
      logger.info("'Calls' sheet created successfully with headers");
      
      // Format headers (make bold and freeze row)
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SPREADSHEET_ID,
        resource: {
          requests: [
            // Bold headers
            {
              repeatCell: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  endRowIndex: 1,
                  startColumnIndex: 0,
                  endColumnIndex: SHEET_HEADERS.length
                },
                cell: {
                  userEnteredFormat: {
                    textFormat: {
                      bold: true
                    }
                  }
                },
                fields: 'userEnteredFormat.textFormat.bold'
              }
            },
            // Freeze first row
            {
              updateSheetProperties: {
                properties: {
                  sheetId: newSheetId,
                  gridProperties: {
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties.frozenRowCount'
              }
            }
          ]
        }
      });
      
      logger.info("'Calls' sheet formatting applied");
    } else {
      logger.info("'Calls' sheet already exists");
    }
  } catch (error) {
    logger.error(`Error ensuring Calls sheet exists: ${error.message}`);
    if (error.response && error.response.data) {
      logger.error(`API error: ${JSON.stringify(error.response.data)}`);
    }
    // Continue anyway - we'll try to use the sheet even if setup failed
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
 * Parse address components
 */
function parseAddress(address) {
  const result = {
    city: '',
    state: '',
    zip: ''
  };

  if (address) {
    // Sample address: "14051 Califa St, Sherman Oaks, CA 91401, USA"
    const addressParts = address.split(',').map(part => part.trim());
    
    // Try to extract components
    if (addressParts.length >= 3) {
      // City is usually the second part
      result.city = addressParts[1] || '';
      
      // State and ZIP are usually in the third part as "CA 91401"
      if (addressParts[2]) {
        const stateZipParts = addressParts[2].split(' ').filter(p => p);
        result.state = stateZipParts[0] || '';
        result.zip = stateZipParts[1] || '';
      }
    }
  }
  
  return result;
}

/**
 * Parse contact name into first and last name
 */
function parseContactName(contactName) {
  const result = {
    firstName: '',
    lastName: ''
  };

  if (contactName) {
    const nameParts = contactName.trim().split(' ');
    if (nameParts.length >= 2) {
      result.firstName = nameParts[0];
      result.lastName = nameParts.slice(1).join(' ');
    } else if (nameParts.length === 1) {
      result.firstName = nameParts[0];
    }
  }
  
  return result;
}

/**
 * Parse geolocation into latitude and longitude
 */
function parseGeolocation(geolocation) {
  const result = {
    latitude: '',
    longitude: ''
  };

  if (geolocation) {
    const geoparts = geolocation.split(',');
    if (geoparts.length === 2) {
      result.latitude = geoparts[0].trim();
      result.longitude = geoparts[1].trim();
    }
  }
  
  return result;
}

/**
 * Generate XML for a call
 */
function generateCallXml(callData) {
  try {
    // Create the root element
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns_xsi': 'http://www.w3.org/2001/XMLSchema-instance' });

    // Fixed GUID for all calls
    doc.ele('Guid').txt('b394de98-a5b7-408d-a1f2-020eddff92b9');
    
    // Add basic call data
    doc.ele('IncidentNumber').txt(callData.CallId || '');
    doc.ele('IncidentOrOnset').txt(callData.Timestamp || '');
    doc.ele('DispatchNotified').txt(callData.Timestamp || '');
    doc.ele('ComplaintReportedByDispatch').txt(callData.CallType || '');
    
    // Add address data
    doc.ele('IncidentAddress1').txt(callData.Address || '');
    doc.ele('IncidentCity').txt(callData.City || '');
    doc.ele('IncidentState').txt(callData.State || '');
    doc.ele('IncidentZip').txt(callData.Zip || '');
    
    // Add dispatch text and nature
    doc.ele('CadDispatchText').txt(callData.Nature || '');
    doc.ele('CallNature').txt(callData.Nature || '');
    doc.ele('CallNatureDescription').txt(`${callData.Nature || ''} ${callData.Notes || ''}`.trim());
    
    // Add unit data
    doc.ele('EmsUnitCallSign').txt(callData.UnitsCsv ? callData.UnitsCsv.split(',')[0] : '');
    doc.ele('UnitNotifiedByDispatch').txt(callData.UnitsCsv ? callData.UnitsCsv.split(',')[0] : '');
    
    // Add response mode
    doc.ele('ResponseModeToScene').txt(callData.ResponseMode || '390');
    
    // Add unit timestamps
    if (callData.EnRouteTime) doc.ele('UnitEnRoute').txt(callData.EnRouteTime);
    if (callData.ArrivedTime) doc.ele('UnitArrivedOnScene').txt(callData.ArrivedTime);
    if (callData.AtPatientTime) doc.ele('UnitAtPatient').txt(callData.AtPatientTime);
    if (callData.ClearedTime) {
      doc.ele('UnitCleared').txt(callData.ClearedTime);
      doc.ele('UnitBackInService').txt(callData.ClearedTime);
    }
    
    // Add geolocation
    if (callData.Latitude && callData.Longitude) {
      doc.ele('SceneGpsLocationLat').txt(callData.Latitude);
      doc.ele('SceneGpsLocationLong').txt(callData.Longitude);
    }
    
    // Add patient information
    if (callData.PatientFirstName) doc.ele('PatientFirstName').txt(callData.PatientFirstName);
    if (callData.PatientLastName) doc.ele('PatientLastName').txt(callData.PatientLastName);
    if (callData.PatientPhone) doc.ele('PatientPhone').txt(callData.PatientPhone);
    if (callData.PatientDOB) doc.ele('PatientDOB').txt(callData.PatientDOB);
    
    // Convert to XML string
    return doc.end({ prettyPrint: true });
  } catch (error) {
    logger.error(`Failed to generate XML: ${error.message}`);
    return ''; // Return empty string on error
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
    
    // Format data for the row - with XML in column D
    const values = [
      callData.Timestamp || new Date().toISOString(),    // Timestamp (A)
      callData.CallId || '',                             // Call ID (B)
      callData.CallType || '',                           // Call Type (C)
      callData.Xml || '',                                // XML (D) - NEW POSITION
      callData.Nature || '',                             // Nature (E)
      callData.Notes || '',                              // Note (F)
      callData.Address || '',                            // Address (G)
      callData.City || '',                               // City (H)
      callData.State || '',                              // State (I)
      callData.Zip || '',                                // Zip (J)
      callData.Latitude || '',                           // Latitude (K)
      callData.Longitude || '',                          // Longitude (L)
      callData.Priority || '',                           // Priority (M)
      callData.ResponseMode || '390',                    // Response Mode (N)
      callData.UnitsCsv || '',                           // Unit Name/Unit ID (O)
      callData.EnRouteTime || '',                        // En Route Time (P)
      callData.ArrivedTime || '',                        // On Scene Time (Q)
      callData.AtPatientTime || '',                      // At Patient Time (R)
      callData.ClearedTime || '',                        // Cleared Time (S)
      callData.PatientFirstName || '',                   // Patient First Name (T)
      callData.PatientLastName || '',                    // Patient Last Name (U)
      callData.PatientPhone || '',                       // Patient Phone (V)
      callData.PatientDOB || ''                          // Patient DOB/ID (W)
    ];
    
    // Get sheets API instance
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Append data to the sheet - Note we use W column for all 23 headers now
    // Use 'Calls' tab as the sheet name
    const result = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Calls!A1:W1', // Match all 23 headers (A-W)
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
    logger.info(`Processing call ${call.CallId}: ${call.Name || 'Unnamed call'}`);
    
    // Get extra data
    const extraData = await getCallExtraData(token, call.CallId);
    
    // Extract call type if available
    let callType = '';
    if (extraData && extraData.Type && extraData.Type.Name) {
      callType = extraData.Type.Name;
    } else if (call.Type) {
      callType = call.Type;
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
    if (call.Priority === 1559 || (extraData && extraData.Priority && extraData.Priority.Id === '1559')) {
      responseMode = '395'; // Cold (Non-emergency)
    }
    
    // Check for non-emergency keywords in nature
    if (call.Nature && typeof call.Nature === 'string') {
      if (/non.?emergency|non.?urgent|routine|scheduled/i.test(call.Nature)) {
        responseMode = '395'; // Non-emergency
      }
    }
    
    // Extract timestamps - based on status mapping
    let unitEnRouteTime = '';
    let unitArrivedTime = '';
    let unitAtPatientTime = '';
    let unitClearedTime = '';
    
    if (extraData && extraData.Activity && extraData.Activity.length > 0) {
      // According to status code mapping in FIELD_MAPPING_REFERENCE.md
      for (const activity of extraData.Activity) {
        const statusId = parseInt(activity.StatusId, 10);
        
        switch (statusId) {
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
    
    // Parse address to get city, state, zip
    const address = call.Address || '';
    const addressComponents = parseAddress(address);
    
    // Parse geolocation to get latitude and longitude
    const geolocation = call.Geolocation || '';
    const geoComponents = parseGeolocation(geolocation);
    
    // Parse contact name to get first and last name
    const contactName = call.ContactName || '';
    const nameComponents = parseContactName(contactName);
    
    // Build complete data for sheet logging with all fields
    const callData = {
      Timestamp: call.LoggedOn,
      CallId: call.CallId,
      CallType: callType,
      Nature: call.Name || '',
      Notes: call.Note || '',
      Address: address,
      City: addressComponents.city,
      State: addressComponents.state,
      Zip: addressComponents.zip,
      Latitude: geoComponents.latitude,
      Longitude: geoComponents.longitude,
      Priority: call.Priority || (extraData && extraData.Priority ? extraData.Priority.Name : ''),
      ResponseMode: responseMode,
      UnitsCsv: units,
      EnRouteTime: unitEnRouteTime,
      ArrivedTime: unitArrivedTime,
      AtPatientTime: unitAtPatientTime,
      ClearedTime: unitClearedTime,
      PatientFirstName: nameComponents.firstName,
      PatientLastName: nameComponents.lastName,
      PatientPhone: call.ContactInfo || '',
      PatientDOB: call.ExternalId || ''
    };
    
    // Generate XML for this call
    const callXml = generateCallXml(callData);
    callData.Xml = callXml; // Add XML to callData object for logging
    
    // Log to Google Sheets
    await logCallToSheet(auth, callData);
    logger.info(`Successfully logged call ${call.CallId} to Google Sheets with XML in column D`);
    
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
    logger.info(`Starting Enhanced Google Sheets export utility`);
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