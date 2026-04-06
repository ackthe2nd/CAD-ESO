/**
 * Basic Google Sheets Export Test
 */
require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

// Simple logging
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

async function getApiToken() {
  try {
    log('Getting Resgrid API token...');
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
    
    const apiToken = tokenResponse.data.access_token;
    log('Successfully obtained API token');
    return apiToken;
  } catch (error) {
    log(`Error getting API token: ${error.message}`);
    if (error.response) {
      log(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

async function initGoogleAuth() {
  try {
    log('Initializing Google Auth...');
    
    // Check if we have the required environment variables
    if (!process.env.LOG_SHEET_ID) {
      log('ERROR: LOG_SHEET_ID environment variable not set');
      return null;
    }
    
    // Try to get credentials from environment variables
    let credentials = null;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      try {
        log('Trying to parse GOOGLE_SERVICE_ACCOUNT_JSON...');
        credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } catch (e) {
        log(`Failed to parse JSON: ${e.message}`);
      }
    }
    
    if (!credentials && process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      try {
        log('Trying to decode GOOGLE_SERVICE_ACCOUNT_JSON_BASE64...');
        const decoded = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8');
        credentials = JSON.parse(decoded);
      } catch (e) {
        log(`Failed to decode base64: ${e.message}`);
      }
    }
    
    if (!credentials) {
      log('ERROR: Could not get valid Google credentials');
      return null;
    }
    
    // Check if credentials have the required fields
    if (!credentials.client_email || !credentials.private_key) {
      log('ERROR: Credentials missing client_email or private_key');
      return null;
    }
    
    // Create auth client
    const auth = new google.auth.JWT(
      credentials.client_email,
      null,
      credentials.private_key,
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    
    // Test authorization
    try {
      await auth.authorize();
      log('Google authentication successful');
      return auth;
    } catch (e) {
      log(`Google auth failed: ${e.message}`);
      return null;
    }
  } catch (error) {
    log(`Error in Google Auth: ${error.message}`);
    return null;
  }
}

async function testGoogleSheet(auth) {
  const spreadsheetId = process.env.LOG_SHEET_ID;
  try {
    log(`Testing access to spreadsheet ${spreadsheetId}...`);
    
    // Get sheets API
    const sheets = google.sheets({ version: 'v4', auth });
    
    // List sheets in the spreadsheet
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
      fields: 'sheets.properties'
    });
    
    const sheetNames = response.data.sheets.map(sheet => sheet.properties.title);
    log(`Found sheets: ${sheetNames.join(', ')}`);
    
    // Check if "Calls" sheet exists
    const callsSheet = response.data.sheets.find(sheet => sheet.properties.title === 'Calls');
    if (callsSheet) {
      log('Found "Calls" sheet! Ready to log data.');
    } else {
      log('No "Calls" sheet found. Will create one when writing data.');
    }
    
    // Write a test row
    const timestamp = new Date().toISOString();
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Calls!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[
          timestamp,
          'TEST',
          'TEST CALL',
          'This is a test entry from export-basic.js'
        ]]
      }
    });
    
    log('Successfully wrote test data to sheet!');
    return true;
  } catch (error) {
    log(`Error testing Google Sheet: ${error.message}`);
    if (error.response && error.response.data) {
      log(`API Error: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function fetchActiveCalls(token) {
  try {
    log('Fetching active calls...');
    
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    
    if (response.data && response.data.Data) {
      log(`Found ${response.data.Data.length} active calls`);
      return response.data.Data;
    } else {
      log('No active calls found or unexpected response format');
      return [];
    }
  } catch (error) {
    log(`Error fetching active calls: ${error.message}`);
    return [];
  }
}

async function writeCallsToSheet(auth, calls) {
  try {
    if (!calls || calls.length === 0) {
      log('No calls to write');
      return;
    }
    
    log(`Writing ${calls.length} calls to Google Sheet...`);
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Prepare the data rows
    const rows = calls.map(call => {
      const timestamp = new Date().toISOString();
      return [
        timestamp,                 // Timestamp
        call.CallId || '',         // Call ID
        call.Type || '',           // Call Type
        JSON.stringify(call)       // Full JSON data
      ];
    });
    
    // Append to sheet
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Calls!A:D',
      valueInputOption: 'USER_ENTERED',
      resource: { values: rows }
    });
    
    log('Successfully wrote call data to sheet!');
    return true;
  } catch (error) {
    log(`Error writing calls to sheet: ${error.message}`);
    if (error.response && error.response.data) {
      log(`API Error: ${JSON.stringify(error.response.data)}`);
    }
    return false;
  }
}

async function main() {
  try {
    log('====== STARTING BASIC GOOGLE SHEETS EXPORT TEST ======');
    
    // Check environment variables
    log('Checking environment variables:');
    log(`RESGRID_USER: ${process.env.RESGRID_USER ? 'Set' : 'Not set'}`);
    log(`RESGRID_PASS: ${process.env.RESGRID_PASS ? 'Set' : 'Not set'}`);
    log(`LOG_SHEET_ID: ${process.env.LOG_SHEET_ID}`);
    log(`GOOGLE_SERVICE_ACCOUNT_JSON: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? 'Set' : 'Not set'}`);
    log(`GOOGLE_SERVICE_ACCOUNT_JSON_BASE64: ${process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 ? 'Set' : 'Not set'}`);
    
    // Get API token
    const token = await getApiToken();
    
    // Initialize Google Auth
    const auth = await initGoogleAuth();
    if (!auth) {
      log('Failed to initialize Google Auth. Cannot continue.');
      return;
    }
    
    // Test Google Sheet access
    const sheetTest = await testGoogleSheet(auth);
    if (!sheetTest) {
      log('Failed to access Google Sheet. Cannot continue.');
      return;
    }
    
    // Get active calls
    const calls = await fetchActiveCalls(token);
    
    // Write calls to sheet
    if (calls.length > 0) {
      await writeCallsToSheet(auth, calls);
    }
    
    log('====== BASIC GOOGLE SHEETS EXPORT TEST COMPLETED ======');
  } catch (error) {
    log(`Test failed: ${error.message}`);
  }
}

// Run the main function
main();