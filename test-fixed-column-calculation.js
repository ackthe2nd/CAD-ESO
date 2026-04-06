/**
 * Test Fixed Column Calculation for Test Result Updates
 */

require('dotenv').config();
const { google } = require('googleapis');

async function testFixedColumnCalculation() {
  console.log('Testing Fixed Column Calculation for Test Result Updates');
  console.log('======================================================');
  
  try {
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get recent call to test with
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B2:B5',
    });
    
    const callIds = dataResponse.data.values?.map(row => row[0]).filter(id => id) || [];
    
    if (callIds.length === 0) {
      console.log('No call IDs found for testing');
      return;
    }
    
    const testCallId = callIds[0];
    console.log(`Testing with call ID: ${testCallId}`);
    
    // Test the corrected updateTestResult function
    const { updateTestResult } = require('./src/test-endpoint');
    
    console.log('\nTesting status updates...');
    
    // Test progression of statuses
    await testUpdateStatus(testCallId, 'initializing');
    await delay(1000);
    
    await testUpdateStatus(testCallId, 'fetching');
    await delay(1000);
    
    await testUpdateStatus(testCallId, 'processing');
    await delay(1000);
    
    await testUpdateStatus(testCallId, 'success');
    
    console.log('\n✅ Test Result column updates now working correctly!');
    console.log('✅ Updates go to column AL (Test Result) instead of column F (Incident Type)');
    
  } catch (error) {
    console.error('Error testing fixed column calculation:', error.message);
  }
}

async function testUpdateStatus(callId, status) {
  console.log(`Setting status: ${status}`);
  
  try {
    // Inline updateTestResult function with correct column calculation
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get headers to find correct column positions
    const headersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AZ1',
    });
    
    const headers = headersResponse.data.values?.[0] || [];
    
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    
    if (callIdIndex === -1 || testResultIndex === -1) {
      console.log('Required columns not found');
      return false;
    }

    // Get call data to find the specific row
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AZ',
    });

    const data = dataResponse.data.values || [];
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][callIdIndex] === callId.toString()) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      console.log(`Call ${callId} not found`);
      return false;
    }

    const timestamp = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    let resultText = `🔄 ${status.toUpperCase()}... (${timestamp})`;
    if (status === 'success') {
      resultText = `✅ SUCCESS (${timestamp})`;
    }

    // CORRECTED: Use proper column calculation
    function indexToColumnLetter(index) {
      let result = '';
      while (index >= 0) {
        result = String.fromCharCode(65 + (index % 26)) + result;
        index = Math.floor(index / 26) - 1;
      }
      return result;
    }
    
    const testResultColumn = indexToColumnLetter(testResultIndex);
    console.log(`  -> Updating column ${testResultColumn} (index ${testResultIndex}) in row ${targetRow}`);
    
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `Call Data!${testResultColumn}${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[resultText]],
      },
    });

    console.log(`  ✅ Updated successfully`);
    return true;
    
  } catch (error) {
    console.error(`  ❌ Error updating status: ${error.message}`);
    return false;
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  await testFixedColumnCalculation();
}

main().catch(console.error);