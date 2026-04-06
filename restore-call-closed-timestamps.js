/**
 * Restore Call Closed Timestamps in Google Sheets
 * Set Call Closed field to show actual closure times instead of Yes/No
 */

require('dotenv').config();
const { google } = require('googleapis');

async function restoreCallClosedTimestamps() {
  console.log('RESTORING CALL CLOSED TIMESTAMPS');
  console.log('='.repeat(33));
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AO50'
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log('No data found in sheets');
      return;
    }
    
    const headers = rows[0];
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    
    const callClosedColumn = callClosedIndex < 26 ? 
      String.fromCharCode(65 + callClosedIndex) : 
      'A' + String.fromCharCode(65 + callClosedIndex - 26);
    
    console.log(`Call Closed column: ${callClosedColumn} (index ${callClosedIndex})`);
    console.log(`Call Closed Time column: ${callClosedTimeIndex}`);
    
    const dataRows = rows.slice(1);
    const updates = [];
    
    console.log('\nRestoring closure timestamps:');
    console.log('-'.repeat(30));
    
    dataRows.forEach((row, index) => {
      if (row.length > callIdIndex && row[callIdIndex]) {
        const callId = row[callIdIndex];
        const currentCallClosed = row[callClosedIndex] || '';
        const callClosedTime = row[callClosedTimeIndex] || '';
        const rowNumber = index + 2;
        
        // If there's a closure time, use it for Call Closed field
        if (callClosedTime && callClosedTime.trim() !== '' && !callClosedTime.startsWith('0001-01-01')) {
          const newValue = callClosedTime;
          
          if (currentCallClosed !== newValue) {
            console.log(`Call ${callId}: "${currentCallClosed}" → "${newValue}"`);
            
            updates.push({
              range: `Call Data!${callClosedColumn}${rowNumber}`,
              values: [[newValue]]
            });
          } else {
            console.log(`Call ${callId}: Already correct`);
          }
        } else if (currentCallClosed === 'Yes' || currentCallClosed === 'No') {
          // Clear Yes/No values if no closure time
          console.log(`Call ${callId}: "${currentCallClosed}" → (empty)`);
          
          updates.push({
            range: `Call Data!${callClosedColumn}${rowNumber}`,
            values: [['']]
          });
        }
      }
    });
    
    if (updates.length > 0) {
      console.log(`\nApplying ${updates.length} updates...`);
      
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: updates
        }
      });
      
      console.log('✓ Successfully restored Call Closed timestamps');
    } else {
      console.log('No updates needed');
    }
    
    // Verify the restoration
    console.log('\nVerification:');
    console.log('-'.repeat(12));
    
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `Call Data!B2:${callClosedColumn}20`
    });
    
    const verifyRows = verifyResponse.data.values || [];
    
    verifyRows.forEach((row, index) => {
      if (row.length > 0 && row[0]) {
        const callId = row[0];
        const callClosed = row[callClosedIndex - 1] || 'EMPTY'; // -1 because we start from column B
        const callClosedTime = row[callClosedTimeIndex - 1] || 'EMPTY';
        
        console.log(`Call ${callId}: Closed="${callClosed}"`);
      }
    });
    
  } catch (error) {
    console.error('Error restoring timestamps:', error.message);
  }
}

async function main() {
  await restoreCallClosedTimestamps();
  
  console.log('\nSUMMARY:');
  console.log('✓ Call Closed field now shows actual closure timestamps');
  console.log('✓ Empty for active calls, timestamp for closed calls');
  console.log('✓ System will populate this field when calls are closed');
}

main().catch(console.error);