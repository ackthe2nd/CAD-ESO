/**
 * Google Sheets Logger for Resgrid-ESO Bridge
 * This module provides logging to Google Sheets for both general logs and call data
 * Enhanced with simplified credential handling using environment variables
 */
const { google } = require('googleapis');
const logger = require('./fix-logger');

// Google Sheets API setup
let sheetsClient = null;
let spreadsheetId = process.env.LOG_SHEET_ID;

// Sheet names and headers
const LOGS_SHEET_NAME = 'Logs';
const LOGS_HEADERS = ['Timestamp', 'Level', 'Message'];

const CALLS_SHEET_NAME = 'Call Data';
const CALLS_HEADERS = [
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
  'Unit Name',
  'Unit Location',
  'En Route Time',
  'Arrived Time',
  'At Patient Time',
  'Cleared Time',
  'Back In Service Time',
  'Latitude',
  'Longitude',
  'Patient First Name',
  'Patient Last Name',
  'Contact Info',
  'External ID'
];

/**
 * Initialize the Google Sheets connection
 * @returns {Promise<boolean>} Success status
 */
async function initialize() {
  try {
    // Skip if already initialized
    if (sheetsClient) {
      return true;
    }

    // Check if required environment variables are set
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.LOG_SHEET_ID) {
      logger.warn('Google Sheets logging is disabled - missing environment variables (need GOOGLE_SERVICE_ACCOUNT_JSON and LOG_SHEET_ID)');
      return false;
    }

    spreadsheetId = process.env.LOG_SHEET_ID;

    try {
      // Parse the JSON directly from environment
      const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      
      // Verify the object has required fields
      if (!serviceAccountCredentials.client_email || !serviceAccountCredentials.private_key) {
        throw new Error('Service account JSON is missing required fields (client_email or private_key)');
      }
      
      // Initialize the auth with credentials
      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountCredentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      logger.info('Successfully created Google Sheets auth from environment credentials');
      
      // Create the sheets client
      const authClient = await auth.getClient();
      sheetsClient = google.sheets({ version: 'v4', auth: authClient });
      
      // Ensure the sheets exist with correct headers
      await ensureSheetExists(LOGS_SHEET_NAME, LOGS_HEADERS);
      await ensureSheetExists(CALLS_SHEET_NAME, CALLS_HEADERS);
      
      logger.info('Google Sheets logging initialized successfully');
      return true;
    } catch (error) {
      logger.error(`Failed to initialize Google Sheets: ${error.message}`);
      return false;
    }
  } catch (error) {
    logger.error(`Failed to initialize Google Sheets logger: ${error.message}`);
    return false;
  }
}

/**
 * Ensure that a sheet exists and has the correct headers
 * @param {string} sheetName - Name of the sheet to check/create
 * @param {Array<string>} headers - Column headers to set
 */
async function ensureSheetExists(sheetName, headers) {
  if (!sheetsClient) {
    return;
  }

  try {
    // Get spreadsheet info
    const spreadsheet = await sheetsClient.spreadsheets.get({
      spreadsheetId,
    });

    // Check if the sheet already exists
    const sheet = spreadsheet.data.sheets.find(
      s => s.properties.title === sheetName
    );

    if (!sheet) {
      // Create the sheet if it doesn't exist
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              addSheet: {
                properties: {
                  title: sheetName,
                },
              },
            },
          ],
        },
      });

      // Add headers to the new sheet
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A1:${String.fromCharCode(65 + headers.length - 1)}1`,
        valueInputOption: 'RAW',
        resource: {
          values: [headers],
        },
      });

      logger.info(`Created ${sheetName} sheet with headers`);
    }
  } catch (error) {
    logger.error(`Error ensuring sheet ${sheetName} exists: ${error.message}`);
  }
}

/**
 * Log a message to the Logs sheet
 * @param {string} message - The log message
 * @param {string} level - Log level (info, warn, error, debug)
 * @returns {Promise<boolean>} Success status
 */
async function sheetLog(message, level = 'info') {
  try {
    if (!sheetsClient) {
      if (!(await initialize())) {
        return false;
      }
    }

    const timestamp = new Date().toISOString();
    const values = [[timestamp, level, message]];

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: `${LOGS_SHEET_NAME}!A:C`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values,
      },
    });

    return true;
  } catch (error) {
    console.error(`Error logging to Google Sheets: ${error.message}`);
    return false;
  }
}

/**
 * Log call data to the Call Data sheet with all XML fields
 * @param {Object} callData - The call data object to log
 * @param {Object} extraData - Extra call data (optional)
 * @returns {Promise<boolean>} Success status
 */
async function sheetCallRow(callData, extraData = {}) {
  try {
    if (!sheetsClient) {
      if (!(await initialize())) {
        return false;
      }
    }

    // Extract data from the nested structure if needed
    let callGetData;
    let extraGetData;
    
    // Handle different ways the data might be structured
    if (callData.Data) {
      // Single object with Data property
      callGetData = callData.Data;
      extraGetData = extraData.Data || callData.Data || {};
    } else if (callData.GetCall && callData.GetCall.Data) {
      // Combined object with separate endpoints
      callGetData = callData.GetCall.Data;
      extraGetData = callData.GetCallExtraData?.Data || {};
    } else {
      // Assume the raw data is directly passed
      callGetData = callData;
      extraGetData = extraData || {};
    }

    // Extract key data from call data object
    const timestamp = new Date().toISOString();
    const callId = callGetData.CallId || '';
    const callType = callGetData.Type || '';
    const nature = callGetData.Nature || '';
    const note = callGetData.Note || '';
    const address = (callGetData.Address || '').replace(/[\r\n]/g, '');
    
    // Parse address components
    let city = '';
    let state = '';
    let zip = '';
    
    if (address) {
      const addressParts = address.split(',').map(part => part.trim());
      
      // Try to extract components
      if (addressParts.length >= 3) {
        // City is usually the second part
        city = addressParts[1] || '';
        
        // State and ZIP are usually in the third part as "CA 91401"
        if (addressParts[2]) {
          const stateZipParts = addressParts[2].split(' ').filter(p => p);
          state = stateZipParts[0] || '';
          zip = stateZipParts[1] || '';
        }
      }
    }

    // Handle priority and response mode
    let priorityId = "1560"; // Default to emergent if missing
    let priorityText = '';
    
    if (callGetData.Priority) {
      if (typeof callGetData.Priority === 'object' && callGetData.Priority.Name) {
        priorityText = callGetData.Priority.Name;
        if (callGetData.Priority.Id) {
          priorityId = callGetData.Priority.Id.toString();
        }
      } else {
        priorityId = callGetData.Priority.toString();
        priorityText = priorityId === "1560" ? "Emergent" : 
                      priorityId === "1559" ? "Non-emergent" : 
                      callGetData.Priority.toString();
      }
    }
    
    // Map priority ID to response mode
    const responseModeMap = {
      "1560": "390", // Emergent -> lights & sirens
      "1559": "395"  // Non-emergent -> no lights & sirens
    };
    const responseMode = responseModeMap[priorityId] || "390"; // Default to lights & sirens
    const responseModeText = responseMode === "390" ? "Lights & Sirens" : "No Lights & Sirens";
    
    // Parse geolocation
    let latitude = '';
    let longitude = '';
    if (callGetData.Geolocation) {
      const geoparts = callGetData.Geolocation.split(',');
      if (geoparts.length === 2) {
        latitude = geoparts[0];
        longitude = geoparts[1];
      }
    }
    
    // Extract unit information
    let unitName = '';
    let unitLocation = '';
    let unitEnRouteTime = '';
    let unitArrivedOnSceneTime = '';
    let unitAtPatientTime = '';
    let unitClearedTime = '';
    let unitBackInServiceTime = '';
    
    // Try to find a valid unit name
    if (callGetData.UnitsCsv) {
      const unitsList = callGetData.UnitsCsv.split(',').map(u => u.trim());
      const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
      if (validUnit) {
        unitName = validUnit;
      }
    }
    
    // If no unit found from UnitsCsv, try the Dispatches array
    if (!unitName && extraGetData.Dispatches && Array.isArray(extraGetData.Dispatches)) {
      const validUnits = extraGetData.Dispatches.filter(d => 
        d.Type === 'Unit' && 
        d.Name && 
        d.Name.length <= 9 && 
        /^[a-zA-Z0-9]+$/.test(d.Name)
      );
      
      if (validUnits.length > 0) {
        unitName = validUnits[0].Name;
        unitLocation = validUnits[0].Location || '';
        
        // Extract timestamps if available
        if (validUnits[0].EnRouteTime) unitEnRouteTime = validUnits[0].EnRouteTime;
        if (validUnits[0].ArrivedTime) unitArrivedOnSceneTime = validUnits[0].ArrivedTime;
        if (validUnits[0].AtPatientTime) unitAtPatientTime = validUnits[0].AtPatientTime;
        if (validUnits[0].ClearedTime) unitClearedTime = validUnits[0].ClearedTime;
      }
    }
    
    // Extract unit times from Activity array
    if (extraGetData.Activity && Array.isArray(extraGetData.Activity)) {
      const validUnitActivities = extraGetData.Activity.filter(a => 
        a.Type === 'Unit' && a.Name === unitName && a.Timestamp && a.StatusId
      );
      
      // StatusId 5 = En Route, StatusId 6 = On Scene
      const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);
      const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);
      
      // Check for back in service status
      const backInServiceKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
      const backInServiceByKeyword = validUnitActivities.find(a => 
        a.StatusText && backInServiceKeywords.some(keyword => 
          a.StatusText.toLowerCase().includes(keyword)
        )
      );
      const availableActivity = validUnitActivities.find(a => a.StatusId === 2);
      
      // Extract timestamps
      if (enRouteActivity && enRouteActivity.Timestamp) unitEnRouteTime = enRouteActivity.Timestamp;
      if (onSceneActivity && onSceneActivity.Timestamp) unitArrivedOnSceneTime = onSceneActivity.Timestamp;
      if (backInServiceByKeyword && backInServiceByKeyword.Timestamp) unitBackInServiceTime = backInServiceByKeyword.Timestamp;
      else if (availableActivity && availableActivity.Timestamp) unitBackInServiceTime = availableActivity.Timestamp;
    }
    
    // Also check for timestamps in the main call data
    if (!unitEnRouteTime && callGetData.EnRouteTime) unitEnRouteTime = callGetData.EnRouteTime;
    if (!unitArrivedOnSceneTime && callGetData.ArrivedTime) unitArrivedOnSceneTime = callGetData.ArrivedTime;
    if (!unitAtPatientTime && callGetData.AtPatientTime) unitAtPatientTime = callGetData.AtPatientTime;
    if (!unitClearedTime && callGetData.ClearedTime) unitClearedTime = callGetData.ClearedTime;
    
    // Also try alternative field names
    if (!unitEnRouteTime && callGetData.UnitEnRouteTime) unitEnRouteTime = callGetData.UnitEnRouteTime;
    if (!unitArrivedOnSceneTime && callGetData.UnitArrivedTime) unitArrivedOnSceneTime = callGetData.UnitArrivedTime;
    if (!unitAtPatientTime && callGetData.UnitAtPatientTime) unitAtPatientTime = callGetData.UnitAtPatientTime;
    if (!unitClearedTime && callGetData.UnitClearedTime) unitClearedTime = callGetData.UnitClearedTime;
    if (!unitBackInServiceTime && callGetData.UnitBackInServiceTime) unitBackInServiceTime = callGetData.UnitBackInServiceTime;
    if (!unitBackInServiceTime && callGetData.BackInServiceTime) unitBackInServiceTime = callGetData.BackInServiceTime;
    
    // If UnitCleared time is available but no BackInService time, use that
    if (!unitBackInServiceTime && unitClearedTime) unitBackInServiceTime = unitClearedTime;
    
    // Patient information
    const contactName = callGetData.ContactName || '';
    const contactInfo = callGetData.ContactInfo || '';
    const externalId = callGetData.ExternalId || '';
    
    // Split contact name into first and last name
    let patientFirstName = '';
    let patientLastName = '';
    
    if (contactName) {
      const nameParts = contactName.trim().split(' ');
      if (nameParts.length >= 2) {
        patientFirstName = nameParts[0];
        patientLastName = nameParts.slice(1).join(' ');
      } else if (nameParts.length === 1) {
        patientFirstName = nameParts[0];
      }
    }

    // Create the values array with all fields
    const values = [[
      timestamp,
      callId,
      callType,
      nature,
      note,
      address,
      city,
      state,
      zip,
      priorityText,
      responseModeText,
      unitName,
      unitLocation,
      unitEnRouteTime,
      unitArrivedOnSceneTime,
      unitAtPatientTime,
      unitClearedTime,
      unitBackInServiceTime,
      latitude,
      longitude,
      patientFirstName,
      patientLastName,
      contactInfo,
      externalId
    ]];

    // Update the range to include all the new columns (A through X = 24 columns)
    await sheetsClient.spreadsheets.values.append({
      spreadsheetId,
      range: `${CALLS_SHEET_NAME}!A:X`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      resource: {
        values,
      },
    });

    return true;
  } catch (error) {
    console.error(`Error logging call data to Google Sheets: ${error.message}`);
    return false;
  }
}

// Initialize on module load
initialize().catch(err => {
  console.error('Failed to initialize Google Sheets logger:', err);
});

module.exports = {
  sheetLog,
  sheetCallRow
};