/**
 * Enhanced Test Call Functionality with City Field Population
 * This script tests the complete call processing pipeline including City field extraction and logging
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

/**
 * Get Resgrid API token
 */
async function getResgridToken() {
  try {
    const response = await axios({
      method: 'POST',
      url: 'https://api.resgrid.com/api/v4/Security/Token',
      headers: {
        'Content-Type': 'application/json'
      },
      data: {
        username: process.env.RESGRID_USER,
        password: process.env.RESGRID_PASS
      }
    });
    
    return response.data?.access_token;
  } catch (error) {
    console.error('Failed to get Resgrid token:', error.message);
    return null;
  }
}

/**
 * Update test result in Google Sheets
 */
async function updateTestResult(callId, status, message = '') {
  try {
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get call data to find the row
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AK'
    });
    
    const data = response.data.values || [];
    const headers = data[0] || [];
    
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const testResultIndex = headers.findIndex(h => h === 'Test Result');
    
    if (callIdIndex === -1 || testResultIndex === -1) {
      console.log('Required columns not found for test result update');
      return;
    }
    
    // Find the row with this call ID
    let targetRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][callIdIndex] === callId.toString()) {
        targetRow = i + 1; // Convert to 1-based for Sheets API
        break;
      }
    }
    
    if (targetRow > 0) {
      const testResultColumn = String.fromCharCode(65 + testResultIndex);
      const statusText = message ? `${status}: ${message}` : status;
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!${testResultColumn}${targetRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: [[statusText]]
        }
      });
    }
  } catch (error) {
    console.error('Failed to update test result:', error.message);
  }
}

/**
 * Process call through the full pipeline including City field extraction
 */
async function processCallWithCityField(callData, extraData) {
  // Import the sheets logger to use the same address parsing logic
  const sheetsLogger = require('./src/sheets-logger');
  
  // Process the call through the complete pipeline
  try {
    // This will trigger the full call processing including City field extraction
    const result = await sheetsLogger.sheetCallRow(callData, extraData);
    return result;
  } catch (error) {
    console.error('Error processing call with city field:', error.message);
    return false;
  }
}

/**
 * Enhanced test function that validates City field population
 */
async function enhancedTestCall(callId) {
  console.log(`Starting enhanced test for call ${callId} with City field validation`);
  
  try {
    // Step 1: Initialize test
    await updateTestResult(callId, '🔄 Initializing');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: Authenticate with Resgrid
    await updateTestResult(callId, '🔐 Authenticating');
    const token = await getResgridToken();
    if (!token) {
      await updateTestResult(callId, '❌ Failed', 'No Resgrid API token');
      return { success: false, error: 'Failed to get Resgrid API token' };
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Fetch call data from Resgrid
    await updateTestResult(callId, '📥 Fetching call data');
    let callData = null;
    
    try {
      // Try active calls first
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
      
      // If not in active calls, try direct call fetch
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
      await updateTestResult(callId, '❌ Failed', 'Call not found');
      return { success: false, error: 'Call not found in Resgrid' };
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Fetch extra call data
    await updateTestResult(callId, '📋 Fetching extra data');
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
      await updateTestResult(callId, '❌ Failed', 'No extra data');
      return { success: false, error: 'Failed to fetch call extra data' };
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 5: Validate address and extract city
    await updateTestResult(callId, '🏙️ Extracting city data');
    const address = callData.Address || '';
    let city = '';
    
    if (address) {
      const addressParts = address.split(',').map(part => part.trim());
      if (addressParts.length >= 2) {
        city = addressParts[1] || '';
      }
    }
    
    console.log(`Address: "${address}"`);
    console.log(`Extracted City: "${city}"`);
    
    if (!address) {
      await updateTestResult(callId, '⚠️ Warning', 'No address data');
    } else if (!city) {
      await updateTestResult(callId, '⚠️ Warning', 'No city extracted');
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 6: Process through full pipeline including City field
    await updateTestResult(callId, '⚙️ Processing pipeline');
    
    const pipelineResult = await processCallWithCityField({ Data: callData }, extraData);
    
    if (!pipelineResult) {
      await updateTestResult(callId, '❌ Failed', 'Pipeline processing failed');
      return { success: false, error: 'Pipeline processing failed' };
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 7: Verify City field was populated
    await updateTestResult(callId, '✅ Verifying city field');
    
    // Check if city field was properly populated in Google Sheets
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:Z'
    });
    
    const sheetData = verifyResponse.data.values || [];
    const sheetHeaders = sheetData[0] || [];
    
    const sheetCallIdIndex = sheetHeaders.findIndex(h => h === 'Emergency Call ID');
    const sheetCityIndex = sheetHeaders.findIndex(h => h === 'City');
    
    let cityInSheet = '';
    if (sheetCallIdIndex !== -1 && sheetCityIndex !== -1) {
      for (let i = 1; i < sheetData.length; i++) {
        if (sheetData[i] && sheetData[i][sheetCallIdIndex] === callId.toString()) {
          cityInSheet = sheetData[i][sheetCityIndex] || '';
          break;
        }
      }
    }

    // Step 8: Complete test with results
    const testResults = {
      success: true,
      callId,
      address,
      extractedCity: city,
      cityInSheet,
      cityFieldWorking: cityInSheet === city && city !== '',
      hasUnits: extraData?.Data?.Dispatches && extraData.Data.Dispatches.length > 0,
      callName: callData.Name,
      timestamp: new Date().toISOString()
    };
    
    if (testResults.cityFieldWorking) {
      await updateTestResult(callId, '✅ Success', `City: "${cityInSheet}"`);
    } else if (city && !cityInSheet) {
      await updateTestResult(callId, '⚠️ Partial', `City extracted but not in sheet: "${city}"`);
    } else if (!city && !address) {
      await updateTestResult(callId, '⚠️ No address', 'No address data to extract city');
    } else {
      await updateTestResult(callId, '⚠️ No city', 'City could not be extracted');
    }
    
    console.log('Test Results:', testResults);
    return testResults;

  } catch (error) {
    console.error(`Enhanced test failed for call ${callId}: ${error.message}`);
    await updateTestResult(callId, '❌ Error', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test multiple calls for City field functionality
 */
async function testMultipleCallsForCity() {
  console.log('Testing multiple calls for City field functionality...');
  
  const testCallIds = ['201230', '201192', '201108', '201105', '201104'];
  const results = [];
  
  for (const callId of testCallIds) {
    console.log(`\n--- Testing Call ${callId} ---`);
    const result = await enhancedTestCall(callId);
    results.push(result);
    
    // Wait between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n=== City Field Test Summary ===');
  console.log('Call ID | City Extracted | City in Sheet | Status');
  console.log('--------|----------------|---------------|--------');
  
  for (const result of results) {
    if (result.success) {
      const status = result.cityFieldWorking ? '✅ Working' : 
                    result.extractedCity ? '⚠️ Partial' : '❌ No City';
      console.log(`${result.callId.padEnd(7)} | ${(result.extractedCity || 'N/A').padEnd(14)} | ${(result.cityInSheet || 'N/A').padEnd(13)} | ${status}`);
    } else {
      console.log(`${callId.padEnd(7)} | Error          | Error         | ❌ Failed`);
    }
  }
  
  const workingCount = results.filter(r => r.success && r.cityFieldWorking).length;
  console.log(`\nCity field working for ${workingCount}/${results.length} tested calls`);
  
  return results;
}

// Main execution
async function main() {
  if (process.argv[2] === 'test-city-multiple') {
    await testMultipleCallsForCity();
  } else if (process.argv[2]) {
    // Test specific call ID
    const callId = process.argv[2];
    await enhancedTestCall(callId);
  } else {
    console.log('Usage: node enhanced-test-call-with-city.js <callId>');
    console.log('   or: node enhanced-test-call-with-city.js test-city-multiple');
  }
}

main().catch(console.error);