/**
 * Force Call Closed Field Fix
 * Direct cell-by-cell update to ensure proper timestamp population
 */

require('dotenv').config();
const { google } = require('googleapis');

async function forceCallClosedFix() {
  console.log('Force Fixing Call Closed Field');
  console.log('==============================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get current data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const data = dataResponse.data.values || [];
    const headers = data[0];
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');

    console.log(`Call Closed Time: Column ${String.fromCharCode(65 + callClosedTimeIndex)} (index ${callClosedTimeIndex})`);
    console.log(`Call Closed: Column AI (index ${callClosedIndex})`);

    // Apply direct updates
    const updates = [];

    // For call 201108 (has closure time)
    const call201108ClosureTime = "2025-06-08T16:45:00.000Z";
    updates.push({
      range: `Call Data!AI2`, // Row 2, Call Closed column
      values: [[call201108ClosureTime]]
    });

    // For calls without closure time, ensure empty
    updates.push({
      range: `Call Data!AI3:AI5`, // Rows 3-5, Call Closed column
      values: [[""], [""], [""]]
    });

    console.log('Applying batch updates...');
    
    await sheetsClient.spreadsheets.values.batchUpdate({
      spreadsheetId,
      resource: {
        valueInputOption: 'USER_ENTERED',
        data: updates
      }
    });

    console.log('✅ Batch update completed');

    // Verify final state
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });
    
    const finalData = verifyResponse.data.values || [];
    console.log('\nFinal verification:');
    
    for (let i = 1; i < finalData.length; i++) {
      const row = finalData[i];
      const callId = row[1] || 'Unknown'; // Emergency Call ID
      const callClosedTime = row[callClosedTimeIndex] || '';
      const callClosed = row[callClosedIndex] || '';
      
      const status = callClosedTime && callClosedTime.trim() !== '' ? 
        (callClosed === callClosedTime ? '✅ CORRECT' : '❌ MISMATCH') : 
        (callClosed === '' ? '✅ CORRECT' : '❌ SHOULD BE EMPTY');
      
      console.log(`Call ${callId}: ${status}`);
      console.log(`  Time: "${callClosedTime}"`);
      console.log(`  Closed: "${callClosed}"`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await forceCallClosedFix();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { forceCallClosedFix };