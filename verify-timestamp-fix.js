/**
 * Verify Timestamp Fix in Google Sheets
 * Check that Call Closed Time now uses proper 2025-06-12 22:38:21 format
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyTimestampFix() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get call data from sheets
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!A1:AK50'
    });
    
    const data = dataResponse.data.values || [];
    const headers = data[0] || [];
    
    // Find Call Closed Time column
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    
    console.log('TIMESTAMP FORMAT VERIFICATION');
    console.log('='.repeat(30));
    console.log(`Call Closed Time column index: ${callClosedTimeIndex}`);
    console.log(`Call Closed column index: ${callClosedIndex}`);
    
    // Check recent calls for timestamp format
    const recentCalls = ['201578', '201576', '201575', '201573', '201572'];
    
    for (const callId of recentCalls) {
      // Find call row
      let callRow = null;
      let rowNumber = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][callIdIndex] === callId) {
          callRow = data[i];
          rowNumber = i + 1;
          break;
        }
      }
      
      if (callRow) {
        const callClosedTime = callRow[callClosedTimeIndex] || '';
        const callClosed = callRow[callClosedIndex] || '';
        
        console.log(`\nCall ${callId} (Row ${rowNumber}):`);
        console.log(`  Call Closed Time: "${callClosedTime}"`);
        console.log(`  Call Closed: "${callClosed}"`);
        
        // Check if timestamp format is correct (YYYY-MM-DD HH:MM:SS)
        const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
        
        if (callClosedTime && timestampRegex.test(callClosedTime)) {
          console.log(`  ✅ Timestamp format is correct (YYYY-MM-DD HH:MM:SS)`);
        } else if (callClosedTime && callClosedTime.trim() !== '') {
          console.log(`  ❌ Timestamp format is incorrect: ${callClosedTime}`);
        } else {
          console.log(`  ⚠️  No closure timestamp found`);
        }
      } else {
        console.log(`\nCall ${callId}: Not found in Google Sheets`);
      }
    }
    
    console.log('\n' + '='.repeat(30));
    console.log('VERIFICATION COMPLETE');
    
  } catch (error) {
    console.error('Error verifying timestamps:', error.message);
  }
}

verifyTimestampFix();