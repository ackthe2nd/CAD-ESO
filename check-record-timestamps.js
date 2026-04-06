/**
 * Check Record Created and Last Updated timestamp fields in Google Sheets
 * Verify they are using Pacific Time consistently
 */

require('dotenv').config();
const { google } = require('googleapis');

const LOG_SHEET_ID = process.env.LOG_SHEET_ID;
const CALLS_SHEET_NAME = 'Call Data';

async function checkRecordTimestamps() {
  console.log('Checking Record Created and Last Updated timestamps for call 201192');
  console.log('=====================================================');

  try {
    // Initialize Google Sheets
    const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });

    console.log('\n1. Getting headers...');
    const headerResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: LOG_SHEET_ID,
      range: `${CALLS_SHEET_NAME}!1:1`
    });
    
    const headers = headerResponse.data.values[0];
    console.log(`Headers found: ${headers.length}`);
    
    // Find Record Created and Last Updated columns
    const recordCreatedIndex = headers.indexOf('Record Created');
    const lastUpdatedIndex = headers.indexOf('Last Updated');
    const callIdIndex = headers.indexOf('Emergency Call ID');
    
    console.log('\n2. Timestamp columns:');
    console.log(`  Column ${String.fromCharCode(65 + recordCreatedIndex)}: Record Created`);
    console.log(`  Column ${String.fromCharCode(65 + lastUpdatedIndex)}: Last Updated`);

    console.log('\n3. Getting all call data...');
    const maxColumn = String.fromCharCode(65 + Math.max(headers.length - 1, 25));
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: LOG_SHEET_ID,
      range: `${CALLS_SHEET_NAME}!A:${maxColumn}`
    });
    
    const rows = dataResponse.data.values || [];

    console.log('\n4. Call 201192 timestamp data:');
    
    // Find call 201192
    let call201192Row = null;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][callIdIndex] === '201192') {
        call201192Row = rows[i];
        break;
      }
    }
    
    if (call201192Row) {
      console.log(`Found in row with ${call201192Row.length} columns`);
      console.log('\nTimestamp data:');
      console.log(`  Record Created: "${call201192Row[recordCreatedIndex] || 'EMPTY'}"`);
      console.log(`  Last Updated: "${call201192Row[lastUpdatedIndex] || 'EMPTY'}"`);
      
      // Check if timestamps are in Pacific Time (should not end with Z for UTC)
      const recordCreated = call201192Row[recordCreatedIndex] || '';
      const lastUpdated = call201192Row[lastUpdatedIndex] || '';
      
      console.log('\nTimestamp analysis:');
      if (recordCreated) {
        const isUTC = recordCreated.endsWith('Z');
        const isPacific = !isUTC && recordCreated.includes('T');
        console.log(`  Record Created format: ${isUTC ? 'UTC (ends with Z)' : isPacific ? 'Pacific Time' : 'Other format'}`);
      }
      
      if (lastUpdated) {
        const isUTC = lastUpdated.endsWith('Z');
        const isPacific = !isUTC && lastUpdated.includes('T');
        console.log(`  Last Updated format: ${isUTC ? 'UTC (ends with Z)' : isPacific ? 'Pacific Time' : 'Other format'}`);
      }
      
    } else {
      console.log('Call 201192 not found in sheets');
    }
    
  } catch (error) {
    console.error('Error checking timestamps:', error.message);
  }
}

checkRecordTimestamps();