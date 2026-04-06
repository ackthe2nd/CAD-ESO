/**
 * Verify Call Closed Field Implementation
 * Check if Call Closed column contains closure timestamp vs boolean
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyCallClosedField() {
  console.log('Verifying Call Closed Field Implementation');
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

    // Get current data to analyze Call Closed field usage
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
    console.log(`Found ${headers.length} headers`);

    // Find key column indices
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const emergencyCallIdIndex = headers.findIndex(h => h === 'Emergency Call ID');

    console.log(`Call Closed Time: Column ${String.fromCharCode(65 + callClosedTimeIndex)} (index ${callClosedTimeIndex})`);
    console.log(`Call Closed: Column ${String.fromCharCode(65 + callClosedIndex)} (index ${callClosedIndex})`);

    console.log('\nAnalyzing Call Closed field usage across all calls:');
    console.log('===================================================');

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const callId = row[emergencyCallIdIndex] || 'Unknown';
      const callClosedTime = row[callClosedTimeIndex] || '';
      const callClosed = row[callClosedIndex] || '';

      console.log(`Call ${callId}:`);
      console.log(`  Call Closed Time: "${callClosedTime}"`);
      console.log(`  Call Closed: "${callClosed}"`);
      
      // Analyze the pattern
      if (callClosedTime && callClosedTime.trim() !== '') {
        // Has closure time - what's in Call Closed field?
        if (callClosed === 'Yes' || callClosed === 'No') {
          console.log(`  ⚠️  Call Closed is boolean (${callClosed}) but Call Closed Time has timestamp`);
        } else if (callClosed === callClosedTime) {
          console.log(`  ✅ Call Closed matches Call Closed Time (both have timestamp)`);
        } else {
          console.log(`  ❓ Call Closed field has different value: "${callClosed}"`);
        }
      } else {
        // No closure time - what's in Call Closed field?
        if (callClosed === 'No' || callClosed === '') {
          console.log(`  ✅ Correctly indicates call not closed`);
        } else {
          console.log(`  ❓ Unexpected Call Closed value for unclosed call: "${callClosed}"`);
        }
      }
      console.log('');
    }

    console.log('\nRecommendation Analysis:');
    console.log('========================');
    
    // Check if we should use Call Closed for timestamp instead of boolean
    let hasTimestampInCallClosed = false;
    let hasBooleanInCallClosed = false;
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const callClosed = row[callClosedIndex] || '';
      
      if (callClosed.includes('T') && callClosed.includes(':')) {
        hasTimestampInCallClosed = true;
      }
      if (callClosed === 'Yes' || callClosed === 'No') {
        hasBooleanInCallClosed = true;
      }
    }

    if (hasTimestampInCallClosed) {
      console.log('✅ Call Closed field contains timestamps - this is correct implementation');
    } else if (hasBooleanInCallClosed) {
      console.log('⚠️  Call Closed field contains boolean values - should contain timestamps');
      console.log('    Recommendation: Update Call Closed to contain closure timestamp instead of Yes/No');
    } else {
      console.log('ℹ️  Call Closed field is mostly empty - needs proper closure timestamp population');
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await verifyCallClosedField();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyCallClosedField };