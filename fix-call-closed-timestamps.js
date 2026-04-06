/**
 * Fix Call Closed Field to Contain Timestamps
 * Updates existing Call Closed entries to use closure timestamps instead of boolean values
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixCallClosedTimestamps() {
  console.log('Fixing Call Closed Field to Use Timestamps');
  console.log('=========================================');

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
    if (data.length === 0) {
      console.log('No data found in Call Data sheet');
      return;
    }

    const headers = data[0];
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const emergencyCallIdIndex = headers.findIndex(h => h === 'Emergency Call ID');

    console.log(`Call Closed Time: Column ${String.fromCharCode(65 + callClosedTimeIndex)} (index ${callClosedTimeIndex})`);
    console.log(`Call Closed: Column ${String.fromCharCode(65 + callClosedIndex)} (index ${callClosedIndex})`);

    let updatesNeeded = [];

    // Check each call and identify what needs updating
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const callId = row[emergencyCallIdIndex] || 'Unknown';
      const callClosedTime = row[callClosedTimeIndex] || '';
      const callClosed = row[callClosedIndex] || '';

      console.log(`\nAnalyzing Call ${callId}:`);
      console.log(`  Call Closed Time: "${callClosedTime}"`);
      console.log(`  Call Closed: "${callClosed}"`);

      // If Call Closed Time has a timestamp but Call Closed doesn't match
      if (callClosedTime && callClosedTime.trim() !== '' && !callClosedTime.startsWith('0001-01-01')) {
        if (callClosed !== callClosedTime) {
          console.log(`  ⚡ UPDATE NEEDED: Set Call Closed to "${callClosedTime}"`);
          updatesNeeded.push({
            rowIndex: i + 1, // 1-based for Google Sheets
            callId,
            newValue: callClosedTime
          });
        } else {
          console.log(`  ✅ Already correct`);
        }
      } else {
        // No closure time - Call Closed should be empty
        if (callClosed === 'Yes' || callClosed === 'No') {
          console.log(`  ⚡ UPDATE NEEDED: Clear boolean value, set to empty`);
          updatesNeeded.push({
            rowIndex: i + 1,
            callId,
            newValue: ''
          });
        } else {
          console.log(`  ✅ Correctly empty for unclosed call`);
        }
      }
    }

    console.log(`\nFound ${updatesNeeded.length} calls needing updates`);

    if (updatesNeeded.length > 0) {
      console.log('\nApplying updates...');
      
      // Apply updates
      for (const update of updatesNeeded) {
        const columnLetter = String.fromCharCode(65 + callClosedIndex);
        const cellRange = `Call Data!${columnLetter}${update.rowIndex}`;
        
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range: cellRange,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: [[update.newValue]],
          },
        });
        
        console.log(`✅ Updated Call ${update.callId}: "${update.newValue}"`);
      }
      
      console.log('\n✅ All Call Closed timestamps updated successfully');
    } else {
      console.log('\n✅ No updates needed - all Call Closed fields are correct');
    }

    // Verify the final state
    console.log('\nFinal verification:');
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });
    
    const finalData = verifyResponse.data.values || [];
    for (let i = 1; i < finalData.length; i++) {
      const row = finalData[i];
      const callId = row[emergencyCallIdIndex] || 'Unknown';
      const callClosedTime = row[callClosedTimeIndex] || '';
      const callClosed = row[callClosedIndex] || '';
      
      console.log(`Call ${callId}: Time="${callClosedTime}" | Closed="${callClosed}"`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await fixCallClosedTimestamps();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixCallClosedTimestamps };