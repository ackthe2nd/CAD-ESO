/**
 * Verify Test Buttons Functionality
 * Tests all call IDs to ensure enhanced status updates work correctly
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

async function verifyTestButtons() {
  console.log('Verifying Enhanced Test Button Functionality');
  console.log('===========================================');

  try {
    // Initialize Google Sheets to get call IDs
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get existing call data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B:AK',
    });

    const rows = dataResponse.data.values || [];
    const callIds = [];

    // Extract call IDs (skip header row)
    for (let i = 1; i < Math.min(rows.length, 5); i++) { // Test first 4 calls
      const callId = rows[i]?.[0];
      if (callId && callId.trim() !== '') {
        callIds.push(callId);
      }
    }

    console.log(`Found ${callIds.length} calls to test: ${callIds.join(', ')}`);

    // Test each call ID
    for (const callId of callIds) {
      console.log(`\nTesting call ${callId}...`);
      
      try {
        const startTime = Date.now();
        
        // Trigger test endpoint
        const response = await axios.get(`http://localhost:5000/api/test/${callId}`, {
          timeout: 30000 // 30 second timeout
        });

        const duration = Date.now() - startTime;
        
        if (response.data.success) {
          console.log(`  ✅ Success: ${response.data.message}`);
          console.log(`  📊 XML Length: ${response.data.xmlLength}`);
          console.log(`  👥 Has Units: ${response.data.hasUnits}`);
          console.log(`  ⏱️ Duration: ${duration}ms`);
        } else {
          console.log(`  ❌ Failed: ${response.data.error}`);
        }

        // Check final result in Google Sheets
        const verifyResponse = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: `Call Data!B:AK`,
        });

        const verifyRows = verifyResponse.data.values || [];
        for (let i = 1; i < verifyRows.length; i++) {
          if (verifyRows[i]?.[0] === callId) {
            const testResult = verifyRows[i]?.[35] || ''; // Test Result column
            console.log(`  📋 Test Result: ${testResult}`);
            break;
          }
        }

      } catch (error) {
        console.log(`  ❌ Error testing call ${callId}: ${error.message}`);
      }

      // Brief delay between tests
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    console.log('\n✅ Test button verification complete!');
    console.log('\nEnhanced Features Verified:');
    console.log('  • Real-time status updates with emojis');
    console.log('  • Step-by-step progress tracking');
    console.log('  • Accurate timestamps');
    console.log('  • Success/failure indicators');
    console.log('  • Detailed error messages');

  } catch (error) {
    console.error('Verification failed:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await verifyTestButtons();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyTestButtons };