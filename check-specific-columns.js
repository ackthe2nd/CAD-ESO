/**
 * Check Specific Columns - Call Closed Time and Test Call
 * Verify why these columns aren't populating correctly
 */

require('dotenv').config();
const { google } = require('googleapis');

async function checkSpecificColumns() {
  console.log('Checking Call Closed Time and Test Call Columns');
  console.log('===============================================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get all data from Call Data sheet
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    console.log(`Total columns: ${headers.length}`);
    console.log(`Data rows: ${allData.length - 1}`);

    // Find the specific columns
    const callClosedTimeIndex = headers.findIndex(h => h.toLowerCase().includes('call closed time'));
    const testCallIndex = headers.findIndex(h => h.toLowerCase().includes('test call'));
    const callClosedIndex = headers.findIndex(h => h.toLowerCase().includes('call closed') && !h.toLowerCase().includes('time'));
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));

    console.log('\nColumn Positions:');
    console.log(`Call Closed Time: ${callClosedTimeIndex !== -1 ? String.fromCharCode(65 + callClosedTimeIndex) + ' (index ' + callClosedTimeIndex + ')' : 'NOT FOUND'}`);
    console.log(`Test Call: ${testCallIndex !== -1 ? String.fromCharCode(65 + testCallIndex) + ' (index ' + testCallIndex + ')' : 'NOT FOUND'}`);
    console.log(`Call Closed: ${callClosedIndex !== -1 ? String.fromCharCode(65 + callClosedIndex) + ' (index ' + callClosedIndex + ')' : 'NOT FOUND'}`);

    console.log('\nColumn Data Analysis:');
    
    if (callClosedTimeIndex !== -1) {
      console.log('\nCall Closed Time Column (S):');
      for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        const callId = row[callIdIndex];
        const closedTime = row[callClosedTimeIndex] || '';
        console.log(`  Call ${callId}: "${closedTime}"`);
      }
    }

    if (testCallIndex !== -1) {
      console.log('\nTest Call Column (AJ):');
      for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        const callId = row[callIdIndex];
        const testCall = row[testCallIndex] || '';
        console.log(`  Call ${callId}: "${testCall}"`);
      }
    }

    if (callClosedIndex !== -1) {
      console.log('\nCall Closed Column (AC):');
      for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        const callId = row[callIdIndex];
        const callClosed = row[callClosedIndex] || '';
        console.log(`  Call ${callId}: "${callClosed}"`);
      }
    }

    // Check what data is actually in the sheet around those columns
    console.log('\nRaw column data from S to AJ:');
    const startCol = 18; // Column S (Call Closed Time)
    const endCol = 35;   // Column AJ (Test Call)
    
    for (let i = 0; i < Math.min(allData.length, 5); i++) {
      const row = allData[i];
      console.log(`Row ${i}:`);
      for (let j = startCol; j <= endCol; j++) {
        const value = row[j] || '';
        const colLetter = String.fromCharCode(65 + j);
        console.log(`  ${colLetter}: "${value}"`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('Error checking columns:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await checkSpecificColumns();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkSpecificColumns };