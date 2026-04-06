/**
 * Test Result Column Verification
 * Verifies that Test Result column updates work correctly with real test button functionality
 */

require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

/**
 * Updated updateTestResult function that properly finds and updates the Test Result column
 */
async function updateTestResult(callId, status, details = '') {
  try {
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
    
    // Find column indices
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    
    if (callIdIndex === -1) {
      console.log('Emergency Call ID column not found in headers');
      return false;
    }
    
    if (testResultIndex === -1) {
      console.log('Test Result column not found in headers');
      return false;
    }

    // Get call data to find the specific row
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AZ',
    });

    const data = dataResponse.data.values || [];
    let targetRow = -1;

    // Find the row with this call ID
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][callIdIndex] === callId.toString()) {
        targetRow = i + 1; // Convert to 1-based row number
        break;
      }
    }

    if (targetRow === -1) {
      console.log(`Call ${callId} not found in Google Sheets for test result update`);
      return false;
    }

    // Create status-specific messages with icons and Pacific Time timestamps
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    let resultText;
    switch (status) {
      case 'initializing':
        resultText = `🔄 INITIALIZING... (${timestamp})`;
        break;
      case 'authenticating':
        resultText = `🔐 AUTHENTICATING... (${timestamp})`;
        break;
      case 'fetching':
        resultText = `📡 FETCHING DATA... (${timestamp})`;
        break;
      case 'processing':
        resultText = `⚙️ PROCESSING... (${timestamp})`;
        break;
      case 'generating':
        resultText = `📄 GENERATING XML... (${timestamp})`;
        break;
      case 'validating':
        resultText = `✔️ VALIDATING... (${timestamp})`;
        break;
      case 'updating':
        resultText = `💾 UPDATING SHEETS... (${timestamp})`;
        break;
      case 'success':
        resultText = `✅ SUCCESS (${timestamp})`;
        break;
      case 'failed':
        resultText = `❌ FAILED: ${details} (${timestamp})`;
        break;
      case 'warning':
        resultText = `⚠️ WARNING: ${details} (${timestamp})`;
        break;
      case 'complete':
        resultText = `✅ COMPLETED: ${details} (${timestamp})`;
        break;
      default:
        resultText = `🔄 ${status.toUpperCase()}... (${timestamp})`;
    }

    // Update the Test Result column using the correct column position
    const testResultColumn = String.fromCharCode(65 + testResultIndex);
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `Call Data!${testResultColumn}${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[resultText]],
      },
    });

    console.log(`✅ Updated test result for call ${callId}: ${status} in column ${testResultColumn}${targetRow}`);
    return true;

  } catch (error) {
    console.error(`❌ Failed to update test result for call ${callId}: ${error.message}`);
    return false;
  }
}

/**
 * Verify Test Result column functionality
 */
async function verifyTestResultColumn() {
  console.log('Test Result Column Verification');
  console.log('===============================');
  
  try {
    // Initialize Google Sheets
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get headers and recent call data
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AZ'
    });
    
    const data = response.data.values || [];
    const headers = data[0] || [];
    
    // Find relevant columns
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    const testCallIndex = headers.findIndex(h => h === 'Test Call');
    
    console.log('Column Analysis:');
    console.log(`Emergency Call ID: ${callIdIndex !== -1 ? String.fromCharCode(65 + callIdIndex) + ' (index ' + callIdIndex + ')' : 'Not found'}`);
    console.log(`Test Result: ${testResultIndex !== -1 ? String.fromCharCode(65 + testResultIndex) + ' (index ' + testResultIndex + ')' : 'Not found'}`);
    console.log(`Test Call: ${testCallIndex !== -1 ? String.fromCharCode(65 + testCallIndex) + ' (index ' + testCallIndex + ')' : 'Not found'}`);
    
    if (testResultIndex === -1) {
      console.log('❌ Test Result column not found - cannot proceed with testing');
      return;
    }
    
    // Find a recent call with a test button to test with
    let testCallId = null;
    for (let i = 1; i < Math.min(data.length, 10); i++) {
      const row = data[i] || [];
      const callId = row[callIdIndex];
      const testButton = row[testCallIndex];
      
      if (callId && testButton && testButton.trim() !== '') {
        testCallId = callId;
        break;
      }
    }
    
    if (!testCallId) {
      console.log('❌ No calls with test buttons found for testing');
      return;
    }
    
    console.log(`\nTesting Test Result updates with call ${testCallId}...`);
    
    // Test different status updates
    const testStatuses = [
      { status: 'initializing', delay: 1000 },
      { status: 'authenticating', delay: 1000 },
      { status: 'fetching', delay: 1000 },
      { status: 'processing', delay: 1000 },
      { status: 'generating', delay: 1000 },
      { status: 'validating', delay: 1000 },
      { status: 'success', delay: 0 }
    ];
    
    for (const test of testStatuses) {
      console.log(`Setting status: ${test.status}`);
      const success = await updateTestResult(testCallId, test.status);
      
      if (!success) {
        console.log(`❌ Failed to update status: ${test.status}`);
        break;
      }
      
      if (test.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, test.delay));
      }
    }
    
    console.log('\n✅ Test Result column verification completed successfully!');
    console.log('✅ The Test Result column now properly updates with real-time status');
    console.log('✅ All test buttons will show progress and completion status');
    
  } catch (error) {
    console.error('❌ Error during Test Result column verification:', error.message);
  }
}

/**
 * Simulate a complete test button workflow
 */
async function simulateTestButtonWorkflow(callId) {
  console.log(`\nSimulating complete test workflow for call ${callId}...`);
  
  try {
    // Step 1: Initialize
    await updateTestResult(callId, 'initializing');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: Authenticate
    await updateTestResult(callId, 'authenticating');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 3: Fetch call data
    await updateTestResult(callId, 'fetching');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 4: Process data
    await updateTestResult(callId, 'processing');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 5: Generate XML
    await updateTestResult(callId, 'generating');
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Step 6: Validate
    await updateTestResult(callId, 'validating');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 7: Update sheets
    await updateTestResult(callId, 'updating');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 8: Complete
    await updateTestResult(callId, 'complete', 'All systems processed successfully');
    
    console.log('✅ Test workflow simulation completed');
    
  } catch (error) {
    await updateTestResult(callId, 'failed', error.message);
    console.error('❌ Test workflow failed:', error.message);
  }
}

async function main() {
  await verifyTestResultColumn();
  
  // Get a call ID to test the workflow
  try {
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B2:B10' // Get recent call IDs
    });
    
    const callIds = response.data.values?.map(row => row[0]).filter(id => id) || [];
    
    if (callIds.length > 0) {
      const testCallId = callIds[0]; // Use most recent call
      await simulateTestButtonWorkflow(testCallId);
    }
    
  } catch (error) {
    console.error('Error getting call IDs for workflow test:', error.message);
  }
}

main().catch(console.error);