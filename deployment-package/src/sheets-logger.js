/**
 * Google Sheets Logger for Resgrid-ESO Bridge
 * This module provides logging to Google Sheets for both general logs and call data
 * 
 * Enhanced with token refresh logic and reconnection handling
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const logger = require('./fix-logger');

// Google Sheets API setup
let sheetsClient = null;
let authClient = null;
let spreadsheetId = process.env.LOG_SHEET_ID;
let lastInitTime = null;
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // 30 minutes

// Sheet names and headers
const LOGS_SHEET_NAME = 'Logs';
const LOGS_HEADERS = ['Timestamp', 'Level', 'Message'];

const CALLS_SHEET_NAME = 'Call Data';
const CALLS_HEADERS = [
  'Call Received Time',
  'Emergency Call ID', 
  'Priority Description',
  'Responding Units',
  'Call Title',
  'Incident Type',
  'Incident Details',
  'Emergency Address',
  'Address Line 1',
  'Address Line 2',
  'City',
  'State',
  'ZIP Code',
  'GPS Latitude',
  'GPS Longitude',
  'Additional Notes',
  'Patient/Caller Name',
  'Contact Information',
  'Patient DOB',
  'Call Closed Time',
  'Record Created',
  'Last Updated',
  'Number of Units',
  'Unit Dispatched Times',
  'Unit En Route Times',
  'Unit Arrived Times',
  'Unit At Patient Times',
  'Unit Cleared Times',
  'Unit Back In Service Times',
  'Unit Transport Times',
  'Unit At Hospital Times',
  'Call Closed',
  'Response Mode',
  'Priority Level',
  'Generated XML',
  'ESO Upload Status',
  'Test Call',
  'Test Result',
  'Location'
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

    // Define auth at the top level so it's accessible throughout the function
    let auth = null;

    // Check for Replit Secret or other environment approaches
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.LOG_SHEET_ID) {
      try {
        logger.info('Using service account JSON from environment variable');
        
        // Parse the JSON directly from environment
        const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        
        // Verify the object has required fields
        if (!serviceAccountCredentials.client_email || !serviceAccountCredentials.private_key) {
          throw new Error('Service account JSON is missing required fields (client_email or private_key)');
        }
        
        // Initialize the auth with credentials
        auth = new google.auth.GoogleAuth({
          credentials: serviceAccountCredentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        // Get and set the spreadsheet ID
        spreadsheetId = process.env.LOG_SHEET_ID;
        
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
        logger.error(`Failed to initialize Google Sheets with env credentials: ${error.message}`);
        return false;
      }
    }
    // Check for older methods (base64 or file path)
    else if ((process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) && process.env.LOG_SHEET_ID) {
      logger.info('Using legacy credential method (file or base64)');
      
      spreadsheetId = process.env.LOG_SHEET_ID;
      
      // Try to use the base64 encoded JSON first (for deployments)
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
        try {
          logger.info('Using base64 encoded service account JSON');
          
          // Try to fix common base64 issues - must be valid base64 without padding issues
          let base64String = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
          // Add padding if needed
          while (base64String.length % 4 !== 0) {
            base64String += '=';
          }
          // Remove any non-base64 characters
          base64String = base64String.replace(/[^A-Za-z0-9+/=]/g, '');
          
          const jsonContent = Buffer.from(base64String, 'base64').toString('utf-8');
          
          // Create a temporary key file in memory
          const keyFileData = JSON.parse(jsonContent);
          
          // Verify the object has required fields
          if (!keyFileData.client_email || !keyFileData.private_key) {
            throw new Error('Service account JSON is missing required fields (client_email or private_key)');
          }
          
          // Initialize auth with the parsed credentials
          auth = new google.auth.GoogleAuth({
            credentials: keyFileData,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
          });
          
          logger.info('Successfully initialized Google Sheets auth with base64 credentials');
        } catch (error) {
          logger.error(`Failed to parse base64 encoded service account JSON: ${error.message}`);
          return false;
        }
      } 
      // Fall back to key file path
      else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
        const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
        
        // Verify the service account key file exists
        if (!fs.existsSync(keyFilePath)) {
          logger.warn(`Google service account key file not found at: ${keyFilePath}`);
          return false;
        }
        
        // Initialize the Google Sheets API client
        auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        
        logger.info('Successfully initialized Google Sheets auth with key file');
      }
      else {
        // Neither base64 nor key file path was valid
        logger.warn('Missing valid Google Sheets credentials (both base64 and key file methods failed)');
        return false;
      }
      
      // Continue only if auth was successfully initialized
      if (!auth) {
        logger.warn('Failed to initialize Google Sheets auth');
        return false;
      }
    } else {
      logger.warn('Google Sheets logging is disabled - missing environment variables (need GOOGLE_SERVICE_ACCOUNT_JSON, or a legacy method plus LOG_SHEET_ID)');
      return false;
    }

    const authClient = await auth.getClient();
    sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    
    // Ensure the sheets exist with correct headers
    await ensureSheetExists(LOGS_SHEET_NAME, LOGS_HEADERS);
    await ensureSheetExists(CALLS_SHEET_NAME, CALLS_HEADERS);
    
    logger.info('Google Sheets logging initialized successfully');
    return true;
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

    const timestamp = convertToPacificTime(new Date().toISOString());
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
    // Track operation for logging
    const startTime = Date.now();
    logger.info(`Starting to log call to Google Sheets...`);

    if (!sheetsClient) {
      logger.info(`Sheets client not initialized, initializing now...`);
      if (!(await initialize())) {
        logger.error(`Failed to initialize Google Sheets before logging call`);
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

    /**
     * Strip HTML tags from a string
     * @param {string} str - String with potential HTML tags
     * @returns {string} - Clean string without HTML tags
     */
    function stripHtmlTags(str) {
      if (!str || typeof str !== 'string') {
        return str || '';
      }
      // Remove all HTML tags, especially <p> tags
      return str.replace(/<\/?[^>]+(>|$)/g, '').trim();
    }

    /**
     * Extract location information from incident details
     * @param {string} incidentDetails - The incident details string
     * @returns {string} - Extracted location or empty string
     */
    function extractLocationFromIncidentDetails(incidentDetails) {
      if (!incidentDetails || typeof incidentDetails !== 'string') {
        return '';
      }
      
      try {
        // Look for "LOCATION:" followed by location data
        // Stop at the next " - " followed by numbers (address) or " - ALERTS"
        const locationMatch = incidentDetails.match(/LOCATION:\s*([^-\n\r]+?)(?:\s*-\s*(?:\d|\w+\s+\w+|\w+,|\w+\s+\w+\s+\w+|ALERTS))/i);
        
        if (locationMatch && locationMatch[1]) {
          let location = locationMatch[1].trim();
          location = location.replace(/[.,;:]+$/, '').trim();
          
          if (location.length < 3) {
            return '';
          }
          
          return location;
        }
        
        // Fallback: try simpler pattern if the complex one doesn't match
        const fallbackMatch = incidentDetails.match(/LOCATION:\s*([^-\n\r]+?)(?:\s*-|$)/i);
        if (fallbackMatch && fallbackMatch[1]) {
          let location = fallbackMatch[1].trim();
          
          // If this looks like an address (contains numbers), skip it
          if (/^\d/.test(location)) {
            return '';
          }
          
          location = location.replace(/[.,;:]+$/, '').trim();
          
          if (location.length < 3) {
            return '';
          }
          
          return location;
        }
        
        return '';
      } catch (error) {
        logger.error(`Error extracting location from incident details: ${error.message}`);
        return '';
      }
    }

    // Extract key data from call data object and strip HTML tags
    const timestamp = convertToPacificTime(new Date().toISOString());
    const callId = callGetData.CallId || '';
    const callTitle = stripHtmlTags(callGetData.Name || '');
    const callType = stripHtmlTags(callGetData.Type || '');
    const nature = stripHtmlTags(callGetData.Nature || '');
    const note = stripHtmlTags(callGetData.Note || '');
    const address = stripHtmlTags((callGetData.Address || '').replace(/[\r\n]/g, ''));
    
    // Parse address components
    let city = '';
    let state = '';
    let zip = '';
    
    if (address) {
      const addressParts = address.split(',').map(part => stripHtmlTags(part.trim()));
      
      // Try to extract components
      if (addressParts.length >= 3) {
        // City is usually the second part
        city = stripHtmlTags(addressParts[1] || '');
        
        // State and ZIP are usually in the third part as "CA 91401"
        if (addressParts[2]) {
          const stateZipParts = addressParts[2].split(' ').filter(p => p);
          state = stripHtmlTags(stateZipParts[0] || '');
          zip = stripHtmlTags(stateZipParts[1] || '');
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
    
    // First check if nature contains non-emergency keywords
    let responseMode = "390"; // Default to lights & sirens
    if (nature && typeof nature === 'string') {
      // Check if nature includes "Non-Emergency" or other keywords
      if (/non.?emergency|non.?urgent|routine|scheduled/i.test(nature)) {
        responseMode = "395"; // Non-emergency (395)
      }
    }
    
    // If no keyword match, then map priority ID to response mode
    if (responseMode === "390") { // Only override if still default value
      const responseModeMap = {
        "1559": "395",  // Non-emergent -> no lights & sirens
        "1560": "390"   // Emergent -> lights & sirens
      };
      responseMode = responseModeMap[priorityId] || "390"; // Default to lights & sirens
    }
    
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
        a.Type === 'Unit' && a.Timestamp && a.StatusId
      );
      
      // Map StatusId values directly (based on Resgrid API docs and logs)
      const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);  // En Route
      const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);  // On Scene
      const atPatientActivity = validUnitActivities.find(a => a.StatusId === 7); // At Patient (if available)
      const clearedActivity = validUnitActivities.find(a => a.StatusId === 8);   // Cleared (if available)
      const availableActivity = validUnitActivities.find(a => a.StatusId === 2); // Available
      const returningActivity = validUnitActivities.find(a => a.StatusId === 9); // Returning (to service)
      
      // Extract timestamps using StatusId values directly
      if (enRouteActivity && enRouteActivity.Timestamp) {
        unitEnRouteTime = enRouteActivity.Timestamp;
      }
      
      if (onSceneActivity && onSceneActivity.Timestamp) {
        unitArrivedOnSceneTime = onSceneActivity.Timestamp;
      }
      
      if (atPatientActivity && atPatientActivity.Timestamp) {
        unitAtPatientTime = atPatientActivity.Timestamp;
      }
      
      // For cleared status:
      // 1. Try StatusId 8 (Cleared)
      // 2. If not found, try StatusId 9 (Returning) or StatusId 2 (Available)
      // 3. Fall back to call.ClosedOn
      if (clearedActivity && clearedActivity.Timestamp) {
        unitClearedTime = clearedActivity.Timestamp;
      } else if (returningActivity && returningActivity.Timestamp) {
        unitClearedTime = returningActivity.Timestamp;
      } else if (availableActivity && availableActivity.Timestamp) {
        unitClearedTime = availableActivity.Timestamp;
      } else if (callGetData.ClosedOn) {
        unitClearedTime = callGetData.ClosedOn;
      }
      
      // For back in service:
      // 1. Try StatusId 9 (Returning)
      // 2. Try StatusId 2 (Available)
      // 3. If neither found, try StatusId 8 (Cleared) - they could use same status
      if (returningActivity && returningActivity.Timestamp) {
        unitBackInServiceTime = returningActivity.Timestamp;
      } else if (availableActivity && availableActivity.Timestamp) {
        unitBackInServiceTime = availableActivity.Timestamp;
      } else if (clearedActivity && clearedActivity.Timestamp) {
        unitBackInServiceTime = clearedActivity.Timestamp;
      }
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
    const cadNumber = callGetData.Number || '';
    
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
    
    // Generate XML for the call if needed
    let xmlContent = '';
    try {
      // Import the entire xml-generator module
      const xmlGenerator = require('./xml-generator');
      
      // Generate the XML
      if (typeof xmlGenerator.generateXmlForCall === 'function') {
        const xmlData = xmlGenerator.generateXmlForCall({
          call: callGetData,
          extraData: extraGetData
        });
        xmlContent = xmlData ? xmlData : '';
      } else {
        // Fallback to direct generateXML if needed
        if (typeof xmlGenerator.generateXML === 'function') {
          xmlContent = xmlGenerator.generateXML(callGetData, extraGetData);
        } else {
          throw new Error('XML generation functions not available');
        }
      }
    } catch (xmlError) {
      logger.warn(`Could not generate XML for call ${callId}: ${xmlError.message}`);
    }
    
    // Apply HTML tag stripping to all other fields
    const priorityTextClean = stripHtmlTags(priorityText);
    const responseModeTextClean = stripHtmlTags(responseModeText);
    const unitNameClean = stripHtmlTags(unitName);
    const patientFirstNameClean = stripHtmlTags(patientFirstName);
    const patientLastNameClean = stripHtmlTags(patientLastName);
    const contactInfoClean = stripHtmlTags(contactInfo);
    const externalIdClean = stripHtmlTags(callGetData.ExternalId || externalId);
    
    // Extract location from incident details
    const locationData = extractLocationFromIncidentDetails(nature || note || '');
    
    // Extract additional fields for complete Google Sheets integration
    const callClosedTime = callGetData.ClosedOn || '';
    const recordCreated = new Date().toISOString();
    const lastUpdated = new Date().toISOString();
    const numberOfUnits = validUnits ? validUnits.length : 0;
    const callClosed = callGetData.ClosedOn ? 'Yes' : 'No';
    const esoUploadStatus = xmlContent ? 'Generated' : 'Pending';
    const testCall = callGetData.IsTest || false;
    const testResult = callGetData.TestResult || '';
    
    // Create the values array with all fields matching the complete header structure
    const values = [[
      timestamp,                    // Call Received Time
      callId,                      // Emergency Call ID
      priorityTextClean,           // Priority Description
      unitNameClean,               // Responding Units
      callTitle,                   // Call Title
      callType,                    // Incident Type
      nature,                      // Incident Details
      address,                     // Emergency Address
      address,                     // Address Line 1
      '',                          // Address Line 2
      city,                        // City
      state,                       // State
      zip,                         // ZIP Code
      latitude,                    // GPS Latitude
      longitude,                   // GPS Longitude
      note,                        // Additional Notes
      patientFirstNameClean + ' ' + patientLastNameClean, // Patient/Caller Name
      contactInfoClean,            // Contact Information
      externalIdClean,             // Patient DOB
      callClosedTime,              // Call Closed Time
      recordCreated,               // Record Created
      lastUpdated,                 // Last Updated
      numberOfUnits,               // Number of Units
      unitDispatchedTime,          // Unit Dispatched Times
      unitEnRouteTime,             // Unit En Route Times
      unitArrivedOnSceneTime,      // Unit Arrived Times
      unitAtPatientTime,           // Unit At Patient Times
      unitClearedTime,             // Unit Cleared Times
      unitBackInServiceTime,       // Unit Back In Service Times
      '',                          // Unit Transport Times
      '',                          // Unit At Hospital Times
      callClosed,                  // Call Closed
      responseModeTextClean,       // Response Mode
      priorityTextClean,           // Priority Level
      xmlContent,                  // Generated XML
      esoUploadStatus,             // ESO Upload Status
      testCall,                    // Test Call
      testResult,                  // Test Result
      locationData                 // Location
    ]];

    try {
      // First, check if this call already exists in the sheet and get all data
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `${CALLS_SHEET_NAME}!A:Z`, // Get all columns to compare data
      });
      
      const rows = response.data.values || [];
      let existingRowIndex = -1;
      let dataChanged = false;
      
      // Find the row with this call ID (skip header row)
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] && rows[i][1] === callId) {
          existingRowIndex = i;
          
          // Compare data to check if anything has changed
          const existingRow = rows[i];
          const newRow = values[0];
          
          // Check if the row length matches what we're expecting
          if (existingRow.length >= newRow.length) {
            // Compare each field to see if anything has changed
            for (let j = 0; j < newRow.length; j++) {
              // Skip timestamp comparison (first column)
              if (j > 0 && existingRow[j] !== newRow[j]) {
                logger.info(`Field change detected for call ${callId}: column ${j+1} changed from "${existingRow[j]}" to "${newRow[j]}"`);
                dataChanged = true;
                break;
              }
            }
          } else {
            // Row exists but doesn't have enough columns - treat as changed
            logger.info(`Existing row for call ${callId} has insufficient columns - treating as changed`);
            dataChanged = true;
          }
          break;
        }
      }
      
      // Determine if we need to resend XML
      let resendXml = dataChanged;
      
      if (existingRowIndex > 0) {
        if (dataChanged) {
          // Call exists but data has changed, update the existing row
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range: `${CALLS_SHEET_NAME}!A${existingRowIndex + 1}:Z${existingRowIndex + 1}`,
            valueInputOption: 'RAW',
            resource: {
              values: values,
            },
          });
          logger.info(`Updated existing call ${callId} at row ${existingRowIndex + 1} due to data changes`);
          
          // Signal that XML should be regenerated and resent
          global.triggerXmlResend = global.triggerXmlResend || {};
          global.triggerXmlResend[callId] = true;
        } else {
          logger.info(`No changes detected for call ${callId} - skipping update`);
        }
      } else {
        // Call doesn't exist, append a new row
        await sheetsClient.spreadsheets.values.append({
          spreadsheetId,
          range: `${CALLS_SHEET_NAME}!A:Z`, // Extended to include all columns
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values,
          },
        });
        logger.info(`Appended new call ${callId} to sheet`);
        
        // New calls should always have XML sent
        resendXml = true;
      }
      
      // Return both success status and whether XML should be resent
      return { success: true, resendXml };
    } catch (error) {
      logger.error(`Error updating Google Sheet: ${error.message}`);
      
      // Fallback to just appending if search/update fails
      await sheetsClient.spreadsheets.values.append({
        spreadsheetId,
        range: `${CALLS_SHEET_NAME}!A:Z`, // Extended to include last updated column
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      });
    }

    // Return both success and resendXml flags
    return { success: true, resendXml: true };
  } catch (error) {
    logger.error(`Error logging call data to Google Sheets: ${error.message}`);
    
    // Check if this is an authentication or access error
    if (error.message.includes('auth') || 
        error.message.includes('token') || 
        error.message.includes('access') ||
        error.message.includes('permission') ||
        error.message.includes('401') ||
        error.message.includes('403')) {
      
      logger.warn('Attempting to refresh Google Sheets authentication due to error...');
      
      try {
        // Clear clients and reinitialize
        sheetsClient = null;
        await initialize();
        
        // Try again with the refreshed client
        logger.info(`Retrying call logging after auth refresh for call ${callGetData.CallId || 'unknown'}`);
        return await sheetCallRow(callData, extraData);
      } catch (retryError) {
        logger.error(`Failed to refresh auth and retry: ${retryError.message}`);
        return { success: false, resendXml: true };
      }
    }
    
    // Return object with default values to avoid breaking compatible code
    return { success: false, resendXml: true };
  }
}

/**
 * Refresh the Google Sheets auth token
 * @returns {Promise<boolean>} Success status
 */
async function refreshAuth() {
  try {
    logger.info('Refreshing Google Sheets authorization...');
    
    // Clear existing client
    sheetsClient = null;
    
    // Reinitialize
    const success = await initialize();
    
    if (success) {
      lastInitTime = Date.now();
      logger.info('Successfully refreshed Google Sheets authorization');
      return true;
    } else {
      logger.error('Failed to refresh Google Sheets authorization');
      return false;
    }
  } catch (error) {
    logger.error(`Error refreshing Google Sheets auth: ${error.message}`);
    return false;
  }
}

/**
 * Check if the sheets client needs to be refreshed
 * @returns {Promise<boolean>} True if the client was refreshed or doesn't need refreshing
 */
async function checkAndRefreshAuth() {
  try {
    // If not initialized or it's been more than the refresh interval
    if (!sheetsClient || !lastInitTime || (Date.now() - lastInitTime > TOKEN_REFRESH_INTERVAL)) {
      return await refreshAuth();
    }
    return true;
  } catch (error) {
    logger.error(`Error checking Google Sheets auth: ${error.message}`);
    return false;
  }
}

/**
 * Handle errors that might be related to auth issues
 * @param {Error} error - The error that occurred
 * @returns {Promise<boolean>} True if the error was handled
 */
async function handleAuthError(error) {
  // Check if it's an auth-related error
  if (error.message.includes('invalid_grant') || 
      error.message.includes('unauthorized') || 
      error.message.includes('unauthenticated') || 
      error.message.includes('auth') ||
      error.message.includes('token') ||
      error.message.includes('expired') ||
      error.code === 401 || 
      error.code === 403) {
    
    logger.warn(`Detected auth error: ${error.message}. Attempting to refresh...`);
    return await refreshAuth();
  }
  return false;
}

// Override the sheetLog function to include auth refreshing
const originalSheetLog = sheetLog;
sheetLog = async function(message, level = 'info') {
  try {
    // Check auth before attempting to log
    await checkAndRefreshAuth();
    return await originalSheetLog(message, level);
  } catch (error) {
    // Try to handle auth errors
    if (await handleAuthError(error)) {
      // Retry after refresh
      return await originalSheetLog(message, level);
    }
    console.error(`Failed to log to sheets after refresh: ${error.message}`);
    return false;
  }
};

// Override the sheetCallRow function to include auth refreshing
const originalSheetCallRow = sheetCallRow;
sheetCallRow = async function(callData, extraData = {}) {
  try {
    // Check auth before attempting to log
    await checkAndRefreshAuth();
    return await originalSheetCallRow(callData, extraData);
  } catch (error) {
    // Try to handle auth errors
    if (await handleAuthError(error)) {
      // Retry after refresh
      return await originalSheetCallRow(callData, extraData);
    }
    console.error(`Failed to log call to sheets after refresh: ${error.message}`);
    // Return object with default values for compatibility with new code
    return { success: false, resendXml: true };
  }
};

// Initialize on module load
initialize().then(() => {
  lastInitTime = Date.now();
  
  // Set up a periodic refresh timer
  setInterval(async () => {
    await checkAndRefreshAuth();
  }, TOKEN_REFRESH_INTERVAL);
  
  logger.info('Google Sheets logger initialized with auto-refresh');
}).catch(err => {
  console.error('Failed to initialize Google Sheets logger:', err);
});

module.exports = {
  sheetLog,
  sheetCallRow
};