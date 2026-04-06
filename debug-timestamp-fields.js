/**
 * Debug timestamp field population in Google Sheets
 * Check if Record Created and Last Updated fields are being set correctly
 */

require('dotenv').config();
const { google } = require('googleapis');

const LOG_SHEET_ID = process.env.LOG_SHEET_ID;
const CALLS_SHEET_NAME = 'Call Data';

async function debugTimestampFields() {
  console.log('Debugging timestamp field population for call 201192');
  console.log('=======================================================');

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
    
    // Find all timestamp-related columns
    const callIdIndex = headers.indexOf('Emergency Call ID');
    const recordCreatedIndex = headers.indexOf('Record Created');
    const lastUpdatedIndex = headers.indexOf('Last Updated');
    const callReceivedIndex = headers.indexOf('Call Received Time');
    
    console.log('\n2. Column mapping:');
    console.log(`  Emergency Call ID: Column ${String.fromCharCode(65 + callIdIndex)} (Index: ${callIdIndex})`);
    console.log(`  Record Created: Column ${String.fromCharCode(65 + recordCreatedIndex)} (Index: ${recordCreatedIndex})`);
    console.log(`  Last Updated: Column ${String.fromCharCode(65 + lastUpdatedIndex)} (Index: ${lastUpdatedIndex})`);
    console.log(`  Call Received Time: Column ${String.fromCharCode(65 + callReceivedIndex)} (Index: ${callReceivedIndex})`);

    console.log('\n3. Getting all call data...');
    const maxColumn = 'AZ'; // Get extended range
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: LOG_SHEET_ID,
      range: `${CALLS_SHEET_NAME}!A:${maxColumn}`
    });
    
    const rows = dataResponse.data.values || [];

    console.log('\n4. Analyzing call 201192 row...');
    
    // Find call 201192
    let call201192Row = null;
    let rowNumber = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i] && rows[i][callIdIndex] === '201192') {
        call201192Row = rows[i];
        rowNumber = i + 1;
        break;
      }
    }
    
    if (call201192Row) {
      console.log(`Found call 201192 in row ${rowNumber}`);
      console.log(`Row has ${call201192Row.length} columns (headers have ${headers.length})`);
      
      console.log('\n5. Full row data analysis:');
      console.log(`  Emergency Call ID (${callIdIndex}): "${call201192Row[callIdIndex] || 'EMPTY'}"`);
      console.log(`  Call Received Time (${callReceivedIndex}): "${call201192Row[callReceivedIndex] || 'EMPTY'}"`);
      console.log(`  Record Created (${recordCreatedIndex}): "${call201192Row[recordCreatedIndex] || 'EMPTY'}"`);
      console.log(`  Last Updated (${lastUpdatedIndex}): "${call201192Row[lastUpdatedIndex] || 'EMPTY'}"`);
      
      // Check if the row length matches the header length
      if (call201192Row.length < headers.length) {
        console.log(`\n⚠️  WARNING: Row has ${call201192Row.length} columns but headers have ${headers.length} columns`);
        console.log(`   This means columns ${call201192Row.length}-${headers.length-1} are empty`);
        
        // Show which columns are missing
        const missingStart = call201192Row.length;
        const missingEnd = headers.length - 1;
        if (recordCreatedIndex >= missingStart || lastUpdatedIndex >= missingStart) {
          console.log(`   Record Created (${recordCreatedIndex}) and/or Last Updated (${lastUpdatedIndex}) are in the missing range`);
        }
      }
      
      console.log('\n6. Last few columns of the row:');
      const startCol = Math.max(0, call201192Row.length - 5);
      for (let i = startCol; i < call201192Row.length; i++) {
        console.log(`  Column ${i} (${String.fromCharCode(65 + i)}): "${call201192Row[i] || 'EMPTY'}" - ${headers[i] || 'NO_HEADER'}`);
      }
      
    } else {
      console.log('Call 201192 not found in sheets');
    }
    
  } catch (error) {
    console.error('Error debugging timestamps:', error.message);
  }
}

debugTimestampFields();