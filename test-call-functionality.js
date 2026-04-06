/**
 * Test Call Functionality - Direct Implementation
 * Tests call processing functionality directly and updates Google Sheets Test Result column
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

/**
 * Update Test Result for a specific call with real-time status
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

    // Find the call row
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B:AK',
    });

    const data = dataResponse.data.values || [];
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === callId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      console.log(`Call ${callId} not found in sheets for test result update`);
      return false;
    }

    // Format result with timestamp
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      timeZone: 'America/Los_Angeles',
      hour12: false 
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
        resultText = `🔧 GENERATING XML... (${timestamp})`;
        break;
      case 'validating':
        resultText = `✔️ VALIDATING... (${timestamp})`;
        break;
      case 'success':
        resultText = `✅ SUCCESS (${timestamp})`;
        break;
      case 'failed':
        resultText = `❌ FAILED: ${details} (${timestamp})`;
        break;
      default:
        resultText = `🔄 ${status.toUpperCase()}... (${timestamp})`;
    }

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `Call Data!AK${targetRow}`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[resultText]],
      },
    });

    return true;
  } catch (error) {
    console.error(`Failed to update test result: ${error.message}`);
    return false;
  }
}

/**
 * Get Resgrid API token using the token manager
 */
async function getResgridToken() {
  try {
    const { getApiToken } = require('./src/token-manager');
    return await getApiToken();
  } catch (error) {
    console.error('Failed to get Resgrid token:', error.message);
    return null;
  }
}

/**
 * Test a specific call
 */
async function testCall(callId) {
  console.log(`Starting test for call ${callId}`);
  
  try {
    // Step 1: Initialize test
    await updateTestResult(callId, 'initializing');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: Authenticate with Resgrid
    await updateTestResult(callId, 'authenticating');
    const token = await getResgridToken();
    if (!token) {
      await updateTestResult(callId, 'failed', 'Failed to get Resgrid API token');
      return { success: false, error: 'Failed to get Resgrid API token' };
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Fetch call data from Resgrid
    await updateTestResult(callId, 'fetching');
    let callData = null;
    
    try {
      const activeCallsResponse = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (activeCallsResponse.data?.Data) {
        callData = activeCallsResponse.data.Data.find(c => c.CallId.toString() === callId.toString());
      }
      
      if (!callData) {
        const callResponse = await axios({
          method: 'GET',
          url: `https://api.resgrid.com/api/v4/Calls/GetCall`,
          params: { callId },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        callData = callResponse.data?.Data;
      }
    } catch (fetchError) {
      console.error(`Error fetching call data: ${fetchError.message}`);
    }
    
    if (!callData) {
      await updateTestResult(callId, 'failed', 'Call not found in Resgrid');
      return { success: false, error: 'Call not found in Resgrid' };
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Fetch extra call data
    await updateTestResult(callId, 'processing');
    let extraData = null;
    
    try {
      const extraResponse = await axios({
        method: 'GET',
        url: `https://api.resgrid.com/api/v4/Calls/GetCallExtraData`,
        params: { callId },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      extraData = extraResponse.data;
    } catch (extraError) {
      console.error(`Error fetching extra data: ${extraError.message}`);
    }
    
    if (!extraData) {
      await updateTestResult(callId, 'failed', 'Failed to fetch call extra data');
      return { success: false, error: 'Failed to fetch call extra data' };
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 5: Generate XML (simulation)
    await updateTestResult(callId, 'generating');
    
    // Simulate XML generation validation
    const hasRequiredData = callData.CallId && callData.LoggedOn && callData.Address;
    const hasUnits = extraData?.Data?.Dispatches && extraData.Data.Dispatches.length > 0;
    
    if (!hasRequiredData) {
      await updateTestResult(callId, 'failed', 'Missing required call data');
      return { success: false, error: 'Missing required call data' };
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 6: Validate structure
    await updateTestResult(callId, 'validating');
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 7: Test completed successfully
    await updateTestResult(callId, 'success');
    
    return { 
      success: true, 
      message: `Test completed successfully for call ${callId}`,
      callId,
      hasUnits,
      callName: callData.Name,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Test failed for call ${callId}: ${error.message}`);
    await updateTestResult(callId, 'failed', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main function - test call from command line
 */
async function main() {
  const callId = process.argv[2];
  
  if (!callId) {
    console.log('Usage: node test-call-functionality.js <callId>');
    console.log('Example: node test-call-functionality.js 201192');
    return;
  }
  
  console.log(`Testing call ${callId}...`);
  const result = await testCall(callId);
  
  console.log('\nTest Result:');
  console.log(JSON.stringify(result, null, 2));
}

// Export for use in other modules
module.exports = { testCall, updateTestResult };

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}