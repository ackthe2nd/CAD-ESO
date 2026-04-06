/**
 * Resgrid to ESO Bridge - Fixed Google Sheets Logging
 * 
 * This script provides direct logging to Google Sheets
 * with correct column mapping for the "Call Data" tab.
 */
require('dotenv').config();
const { google } = require('googleapis');

// Environment variables for Google Sheets
const {
  GOOGLE_SERVICE_ACCOUNT_KEY_B64,
  GOOGLE_SERVICE_ACCOUNT_JSON,
  LOG_SHEET_ID
} = process.env;

let sheetsAuth = null;
let sheetsClient = null;
const sheets = google.sheets('v4');

/**
 * Initialize Google Sheets authentication
 */
async function initializeSheets() {
  try {
    console.log('Initializing Google Sheets logging...');
    
    // Check for required environment variables
    if (!LOG_SHEET_ID) {
      console.error('❌ Missing LOG_SHEET_ID environment variable');
      return false;
    }
    
    // Try to load credentials from base64 string (preferred for Fly.io)
    if (GOOGLE_SERVICE_ACCOUNT_KEY_B64) {
      console.log('Using base64 encoded Google service account key');
      const keyJson = JSON.parse(
        Buffer.from(GOOGLE_SERVICE_ACCOUNT_KEY_B64, 'base64').toString('utf8')
      );
      
      sheetsAuth = new google.auth.GoogleAuth({
        credentials: keyJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    } 
    // Try to load credentials from JSON string
    else if (GOOGLE_SERVICE_ACCOUNT_JSON) {
      console.log('Using JSON string Google service account key');
      const keyJson = JSON.parse(GOOGLE_SERVICE_ACCOUNT_JSON);
      
      sheetsAuth = new google.auth.GoogleAuth({
        credentials: keyJson,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
    }
    // No credentials available
    else {
      console.error('❌ No Google Sheets credentials found');
      return false;
    }
    
    // Get auth client
    sheetsClient = await sheetsAuth.getClient();
    console.log('✅ Google Sheets authentication successful');
    return true;
  } catch (error) {
    console.error(`❌ Error initializing Google Sheets: ${error.message}`);
    return false;
  }
}

/**
 * Log a call to Google Sheets
 * @param {Object} call - Basic call data
 * @param {Array} activity - Call activity data
 */
async function logCallToSheet(call, activity) {
  try {
    if (!sheetsClient || !LOG_SHEET_ID) {
      console.warn('Google Sheets logging not initialized');
      return false;
    }
    
    // Process activity data to extract status events
    const unitsCsv = activity
      .filter(a => a.Type === 'Unit')
      .map(a => a.Name)
      .join(', ') || 'No Units';
      
    // Find status events
    const enRouteEvent = activity.find(e => /en.?route/i.test(e.StatusText || e.Type || '')) || {};
    const onSceneEvent = activity.find(e => /on.?scene/i.test(e.StatusText || e.Type || '')) || {};
    const atPatientEvent = activity.find(e => /patient/i.test(e.StatusText || e.Type || '')) || {};
    const clearedEvent = activity.find(e => /cleared/i.test(e.StatusText || e.Type || '')) || {};
    const backInServiceEvent = activity.find(e => /in.?service/i.test(e.StatusText || e.Type || '')) || {};
    
    // Get timestamps
    const enRouteTime = enRouteEvent.Timestamp || '';
    const onSceneTime = onSceneEvent.Timestamp || '';
    const atPatientTime = atPatientEvent.Timestamp || '';
    const clearedTime = clearedEvent.Timestamp || call.ClosedOn || '';
    const backInServiceTime = backInServiceEvent.Timestamp || '';
    
    // Parse address components
    const addressStr = (call.Address || '').replace(/[\r\n]/g, '').trim();
    const addressMatch = /^(.*?),\s*([^,]+),\s*([A-Z]{2})\s*(\d{5})(?:.*)?$/i.exec(addressStr);
    const address = addressMatch ? addressMatch[1] : addressStr;
    const city = addressMatch ? addressMatch[2] : '';
    const state = addressMatch ? addressMatch[3] : '';
    const zip = addressMatch ? addressMatch[4] : '';
    
    // Extract coordinates
    const [latitude, longitude] = (call.Geolocation || '').split(',').map(c => c.trim());
    
    // Clean HTML tags from text fields
    const stripTags = html => (html || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
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
      call.Priority,                      // Priority
      call.Priority === '1560' ? 390 : 395, // Response Mode (mapped from priority)
      unitsCsv,                           // Unit Name
      '',                                 // Unit Location
      enRouteTime,                        // En Route Time
      onSceneTime,                        // Arrived Time
      atPatientTime,                      // At Patient Time
      clearedTime,                        // Cleared Time
      backInServiceTime,                  // Back In Service Time
      latitude || '',                     // Latitude
      longitude || '',                    // Longitude
      '',                                 // Patient First Name
      '',                                 // Patient Last Name
      '',                                 // Contact Info
      call.Number || ''                   // External ID (RunNumber)
    ];
    
    // Append to Google Sheet
    await sheets.spreadsheets.values.append({
      auth: sheetsClient,
      spreadsheetId: LOG_SHEET_ID,
      range: 'Call Data!A:X',  // Match the range to your headers
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [rowData] }
    });
    
    console.log(`✅ Logged call ${call.CallId} to Google Sheets`);
    return true;
  } catch (error) {
    console.error(`❌ Error logging to Google Sheets: ${error.message}`);
    return false;
  }
}

/**
 * Log a message to the Logs sheet
 * @param {string} message - Message to log
 * @param {string} level - Log level (INFO, ERROR, etc.)
 */
async function logMessage(message, level = 'INFO') {
  try {
    if (!sheetsClient || !LOG_SHEET_ID) {
      console.warn('Google Sheets logging not initialized');
      return false;
    }
    
    // Append to Logs sheet
    await sheets.spreadsheets.values.append({
      auth: sheetsClient,
      spreadsheetId: LOG_SHEET_ID,
      range: 'Logs!A:C',
      valueInputOption: 'USER_ENTERED',
      requestBody: { 
        values: [[ 
          new Date().toISOString(), 
          level, 
          message 
        ]] 
      }
    });
    
    return true;
  } catch (error) {
    console.error(`Error writing to logs sheet: ${error.message}`);
    return false;
  }
}

module.exports = {
  initialize: initializeSheets,
  logCall: logCallToSheet,
  logMessage: logMessage
};