/**
 * Verify GPS Geocoding Results in Google Sheets
 * Check that geocoded coordinates are properly stored
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyGeocodingInSheets() {
  console.log('Verifying GPS geocoding results in Google Sheets...\n');
  
  try {
    // Initialize Google Sheets auth
    const serviceAccountJson = JSON.parse(Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, 'base64').toString());
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountJson,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const sheetId = process.env.LOG_SHEET_ID;
    
    // Get Call Data sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: 'Call Data!A1:AZ50'
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('No data found in Call Data sheet');
      return;
    }
    
    const headers = rows[0];
    const latIndex = headers.indexOf('GPS Latitude');
    const lonIndex = headers.indexOf('GPS Longitude');
    const addressIndex = headers.indexOf('Emergency Address');
    const callIdIndex = headers.indexOf('Call ID');
    
    console.log('Recent calls with GPS coordinates:\n');
    
    // Check last 10 calls for GPS data
    for (let i = Math.max(1, rows.length - 10); i < rows.length; i++) {
      const row = rows[i];
      if (row && row[callIdIndex]) {
        const callId = row[callIdIndex];
        const address = row[addressIndex] || 'No address';
        const lat = row[latIndex] || '';
        const lon = row[lonIndex] || '';
        
        console.log(`Call ${callId}:`);
        console.log(`  Address: ${address}`);
        console.log(`  GPS: ${lat}, ${lon}`);
        
        if (lat && lon && lat !== '' && lon !== '') {
          console.log(`  ✓ Has GPS coordinates`);
        } else {
          console.log(`  ⚠ Missing GPS coordinates`);
        }
        console.log('');
      }
    }
    
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

verifyGeocodingInSheets();