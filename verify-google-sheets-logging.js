/**
 * Verify Google Sheets logging is working correctly
 * This script checks if call data is being logged to the Google Sheet
 */

require('dotenv').config();
const { google } = require('googleapis');

async function getGoogleAuth() {
  try {
    // Use the same authentication method as the main application
    let serviceAccount;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      // Direct JSON string
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      // Base64 encoded JSON
      const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedJson);
    } else {
      throw new Error('No Google service account credentials found in environment variables');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return auth;
  } catch (error) {
    console.error('Failed to authenticate with Google:', error.message);
    throw error;
  }
}

async function checkSheetsLogging() {
  console.log('Verifying Google Sheets Call Data Logging');
  console.log('========================================\n');

  try {
    console.log('Authenticating with Google Sheets...');
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✓ Authentication successful\n');

    const spreadsheetId = process.env.LOG_SHEET_ID;
    if (!spreadsheetId) {
      throw new Error('LOG_SHEET_ID environment variable not set');
    }

    console.log(`Checking spreadsheet: ${spreadsheetId}`);

    // Get sheet metadata to find available sheets
    console.log('Fetching sheet information...');
    const sheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: spreadsheetId
    });

    const availableSheets = sheetInfo.data.sheets.map(sheet => sheet.properties.title);
    console.log(`Available sheets: ${availableSheets.join(', ')}\n`);

    // Check for "Call Data" tab specifically
    const callDataSheet = availableSheets.find(name => 
      name.toLowerCase().includes('call') && name.toLowerCase().includes('data')
    );

    if (!callDataSheet) {
      console.log('No "Call Data" tab found. Available sheets:');
      availableSheets.forEach(sheet => console.log(`  - ${sheet}`));
      console.log('\nChecking the first available sheet instead...');
    }

    const targetSheet = callDataSheet || availableSheets[0];
    console.log(`Checking sheet: "${targetSheet}"`);

    // Read recent data from the sheet
    const range = `${targetSheet}!A1:Z100`; // Get headers and recent data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: range
    });

    const rows = response.data.values || [];
    console.log(`✓ Retrieved ${rows.length} rows from the sheet\n`);

    if (rows.length === 0) {
      console.log('Sheet is empty - no call data has been logged yet');
      return;
    }

    // Check headers
    const headers = rows[0] || [];
    console.log('Sheet headers:');
    headers.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });
    console.log('');

    // Check for recent entries
    const dataRows = rows.slice(1); // Skip header row
    console.log(`Data rows found: ${dataRows.length}`);

    if (dataRows.length > 0) {
      console.log('\nRecent entries:');
      
      // Show last 5 entries
      const recentEntries = dataRows.slice(-5);
      recentEntries.forEach((row, index) => {
        const entryNum = dataRows.length - recentEntries.length + index + 1;
        console.log(`\nEntry ${entryNum}:`);
        
        // Map row data to headers
        headers.forEach((header, colIndex) => {
          const value = row[colIndex] || '';
          if (value) {
            console.log(`  ${header}: ${value.length > 100 ? value.substring(0, 100) + '...' : value}`);
          }
        });
      });

      // Check for call-specific data
      const callIdColumn = headers.findIndex(h => h.toLowerCase().includes('call') && h.toLowerCase().includes('id'));
      const xmlColumn = headers.findIndex(h => h.toLowerCase().includes('xml'));
      const timestampColumn = headers.findIndex(h => h.toLowerCase().includes('timestamp'));

      console.log('\nData Analysis:');
      console.log(`Call ID column found: ${callIdColumn >= 0 ? 'Yes (column ' + (callIdColumn + 1) + ')' : 'No'}`);
      console.log(`XML column found: ${xmlColumn >= 0 ? 'Yes (column ' + (xmlColumn + 1) + ')' : 'No'}`);
      console.log(`Timestamp column found: ${timestampColumn >= 0 ? 'Yes (column ' + (timestampColumn + 1) + ')' : 'No'}`);

      // Count entries with call data
      let callDataEntries = 0;
      dataRows.forEach(row => {
        if (callIdColumn >= 0 && row[callIdColumn] && row[callIdColumn].trim()) {
          callDataEntries++;
        }
      });

      console.log(`Entries with Call ID data: ${callDataEntries}`);

      // Check for recent activity (last 24 hours)
      if (timestampColumn >= 0) {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        let recentEntries = 0;
        dataRows.forEach(row => {
          const timestamp = row[timestampColumn];
          if (timestamp) {
            const entryDate = new Date(timestamp);
            if (entryDate > yesterday) {
              recentEntries++;
            }
          }
        });

        console.log(`Entries from last 24 hours: ${recentEntries}`);
      }

    } else {
      console.log('No data rows found - only headers present');
    }

    console.log('\n✓ Google Sheets verification complete');

  } catch (error) {
    if (error.code === 403) {
      console.error('Access denied to Google Sheets. Please check:');
      console.error('1. Service account has access to the spreadsheet');
      console.error('2. Spreadsheet ID is correct');
      console.error('3. Service account credentials are valid');
    } else if (error.code === 404) {
      console.error('Spreadsheet not found. Please check the LOG_SHEET_ID value.');
    } else {
      console.error('Error verifying Google Sheets:', error.message);
    }
  }
}

// Run verification
checkSheetsLogging();