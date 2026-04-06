/**
 * Test Record Created Timestamp Format Fix
 * Verify that new calls get proper "2025-06-13 01:02:43" format
 */

require('dotenv').config();
const { google } = require('googleapis');

async function testRecordCreatedTimestamp() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get recent call data from sheets
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!A1:AK20'
    });
    
    const data = dataResponse.data.values || [];
    const headers = data[0] || [];
    
    // Find relevant columns
    const recordCreatedIndex = headers.findIndex(h => h === 'Record Created');
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    
    console.log('RECORD CREATED TIMESTAMP FORMAT TEST');
    console.log('='.repeat(40));
    console.log(`Record Created column index: ${recordCreatedIndex}`);
    console.log(`Call Closed Time column index: ${callClosedTimeIndex}`);
    
    // Check the most recent calls
    const recentCalls = data.slice(1, 6); // Skip header, get first 5 data rows
    
    for (let i = 0; i < recentCalls.length; i++) {
      const row = recentCalls[i];
      const callId = row[callIdIndex] || `Row ${i + 2}`;
      const recordCreated = row[recordCreatedIndex] || '';
      const callClosedTime = row[callClosedTimeIndex] || '';
      
      console.log(`\nCall ${callId}:`);
      console.log(`  Record Created: "${recordCreated}"`);
      console.log(`  Call Closed Time: "${callClosedTime}"`);
      
      // Check if Record Created uses proper format (YYYY-MM-DD HH:MM:SS)
      const timestampRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      
      if (recordCreated && timestampRegex.test(recordCreated)) {
        console.log(`  ✅ Record Created format is correct (YYYY-MM-DD HH:MM:SS)`);
      } else if (recordCreated && recordCreated.trim() !== '') {
        console.log(`  ❌ Record Created format is incorrect: ${recordCreated}`);
      } else {
        console.log(`  ⚠️  No Record Created timestamp found`);
      }
      
      // Compare with Call Closed Time format for consistency
      if (callClosedTime && timestampRegex.test(callClosedTime)) {
        console.log(`  ✅ Call Closed Time format is also correct`);
      } else if (callClosedTime && callClosedTime.trim() !== '') {
        console.log(`  ⚠️  Call Closed Time format differs: ${callClosedTime}`);
      }
    }
    
    console.log('\n' + '='.repeat(40));
    console.log('TEST COMPLETE');
    
  } catch (error) {
    console.error('Error testing Record Created timestamps:', error.message);
  }
}

testRecordCreatedTimestamp();