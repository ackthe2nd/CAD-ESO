/**
 * Debug Call Closed Column Issue
 * Identify exact column mapping and fix the Call Closed field properly
 */

require('dotenv').config();
const { google } = require('googleapis');

async function debugCallClosedColumn() {
  console.log('DEBUGGING CALL CLOSED COLUMN MAPPING');
  console.log('='.repeat(38));
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get headers to debug column mapping
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1'
    });
    
    const headers = headerResponse.data.values[0];
    console.log(`Total columns: ${headers.length}`);
    
    headers.forEach((header, index) => {
      const columnLetter = index < 26 ? 
        String.fromCharCode(65 + index) : 
        String.fromCharCode(65 + Math.floor(index / 26) - 1) + String.fromCharCode(65 + (index % 26));
      
      if (header.includes('Call Closed') || header.includes('Closed')) {
        console.log(`*** ${columnLetter}${index + 1}: "${header}" ***`);
      } else {
        console.log(`${columnLetter}${index + 1}: "${header}"`);
      }
    });
    
    // Get a few rows of actual data to see current values
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A2:AO5'
    });
    
    const dataRows = dataResponse.data.values || [];
    
    console.log('\nSample data from first few calls:');
    console.log('-'.repeat(35));
    
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    
    console.log(`Call ID index: ${callIdIndex}`);
    console.log(`Call Closed index: ${callClosedIndex}`);
    console.log(`Call Closed Time index: ${callClosedTimeIndex}`);
    
    dataRows.forEach((row, index) => {
      if (row.length > callIdIndex && row[callIdIndex]) {
        const callId = row[callIdIndex];
        const callClosed = row[callClosedIndex] || 'EMPTY';
        const callClosedTime = row[callClosedTimeIndex] || 'EMPTY';
        
        console.log(`Call ${callId}: Closed="${callClosed}", Time="${callClosedTime}"`);
      }
    });
    
    // Apply direct fix to specific cells
    const callClosedColumnLetter = callClosedIndex < 26 ? 
      String.fromCharCode(65 + callClosedIndex) : 
      String.fromCharCode(65 + Math.floor(callClosedIndex / 26) - 1) + String.fromCharCode(65 + (callClosedIndex % 26));
    
    console.log(`\nApplying direct fixes to column ${callClosedColumnLetter}...`);
    
    // Get all data to identify closed calls
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A2:AO50'
    });
    
    const allRows = allDataResponse.data.values || [];
    const directUpdates = [];
    
    allRows.forEach((row, index) => {
      if (row.length > callIdIndex && row[callIdIndex]) {
        const callId = row[callIdIndex];
        const callClosedTime = row[callClosedTimeIndex] || '';
        const rowNumber = index + 2;
        
        // Determine if call is closed based on closure time
        const isClosed = callClosedTime && 
                        callClosedTime.trim() !== '' && 
                        !callClosedTime.startsWith('0001-01-01') &&
                        callClosedTime.includes('2025-');
        
        const newValue = isClosed ? 'Yes' : 'No';
        
        directUpdates.push({
          range: `Call Data!${callClosedColumnLetter}${rowNumber}`,
          values: [[newValue]]
        });
        
        console.log(`Row ${rowNumber}, Call ${callId}: ${newValue}`);
      }
    });
    
    if (directUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: directUpdates
        }
      });
      
      console.log(`\n✓ Applied ${directUpdates.length} direct updates`);
    }
    
    // Verify the fix worked
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Call Data!${callClosedColumnLetter}2:${callClosedColumnLetter}20`
    });
    
    const verifyValues = verifyResponse.data.values || [];
    
    console.log('\nVerification - Call Closed column values:');
    verifyValues.forEach((value, index) => {
      const rowNumber = index + 2;
      const cellValue = value[0] || 'EMPTY';
      console.log(`Row ${rowNumber}: "${cellValue}"`);
    });
    
  } catch (error) {
    console.error('Error debugging column:', error.message);
  }
}

async function main() {
  await debugCallClosedColumn();
}

main().catch(console.error);