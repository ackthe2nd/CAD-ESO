/**
 * Check what's actually in Google Sheets for call 201192
 */
require('dotenv').config();
const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');

async function checkSheetsData() {
  try {
    console.log('Checking Google Sheets data for call 201192');
    console.log('=============================================\n');

    // Initialize Google Sheets client
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      console.log('❌ Missing GOOGLE_SERVICE_ACCOUNT_JSON');
      return;
    }

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    console.log('1. Getting headers...');
    const headersResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1'
    });

    const headers = headersResponse.data.values[0];
    console.log('Headers found:', headers.length);
    
    // Find unit timing columns
    const unitTimingColumns = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => header.includes('Unit ') && header.includes('Times'));
    
    console.log('\n2. Unit timing columns:');
    unitTimingColumns.forEach(({ header, index }) => {
      console.log(`  Column ${String.fromCharCode(65 + index)}: ${header}`);
    });

    // Find contact columns
    const contactColumns = headers
      .map((header, index) => ({ header, index }))
      .filter(({ header }) => 
        header.includes('Contact Information') || 
        header.includes('Patient/Caller Name') || 
        header.includes('Patient DOB')
      );
    
    console.log('\n3. Contact columns:');
    contactColumns.forEach(({ header, index }) => {
      console.log(`  Column ${String.fromCharCode(65 + index)}: ${header}`);
    });

    console.log('\n4. Getting all call data...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AZ'
    });

    const rows = dataResponse.data.values;
    const call201192Row = rows.find(row => row[1] === '201192'); // Emergency Call ID is usually column B

    if (call201192Row) {
      console.log('\n5. Call 201192 data:');
      console.log(`Found in row with ${call201192Row.length} columns`);
      
      // Show unit timing data
      console.log('\nUnit timing data:');
      unitTimingColumns.forEach(({ header, index }) => {
        const value = call201192Row[index] || 'EMPTY';
        console.log(`  ${header}: "${value}"`);
      });
      
      // Show contact data
      console.log('\nContact data:');
      contactColumns.forEach(({ header, index }) => {
        const value = call201192Row[index] || 'EMPTY';
        console.log(`  ${header}: "${value}"`);
      });
      
      // Show responding units for reference
      const unitsColumnIndex = headers.findIndex(h => h === 'Responding Units');
      if (unitsColumnIndex !== -1) {
        console.log(`\nResponding Units: "${call201192Row[unitsColumnIndex] || 'EMPTY'}"`);
      }
    } else {
      console.log('\n❌ Call 201192 not found in sheets');
    }

  } catch (error) {
    console.error('Check failed:', error.message);
  }
}

if (require.main === module) {
  checkSheetsData();
}