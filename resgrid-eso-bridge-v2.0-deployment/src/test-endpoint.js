/**
 * Test Endpoint for Call Testing
 * Handles test requests and updates Test Result column in Google Sheets
 */

const express = require('express');
const { generateXML } = require('./xml-generator');
const { sheetCallRow } = require('./sheets-logger');
const { getCallExtraData } = require('./resgrid-api');
const { getApiToken } = require('./token-manager');
const axios = require('axios');
const logger = require('./fix-logger');

const router = express.Router();

// Debug route to verify router is working
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Test Endpoint Router',
    timestamp: new Date().toISOString(),
    availableRoutes: [
      'GET /test/:callId - Run test for specific call',
      'GET /test/:callId/status - Get test status'
    ]
  });
});

/**
 * Update Test Result for a specific call with real-time status
 */
async function updateTestResult(callId, status, details = '') {
  try {
    const { google } = require('googleapis');
    
    // Initialize Google Sheets authentication
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
      if (data[i] && data[i][0] === callId) { // Emergency Call ID is in column B (index 0)
        targetRow = i + 1; // Convert to 1-based row number
        break;
      }
    }

    if (targetRow === -1) {
      logger.warn(`Call ${callId} not found in Google Sheets for test result update`);
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

    logger.info(`Updated test result for call ${callId}: ${status}`);
    return true;

  } catch (error) {
    logger.error(`Failed to update test result for call ${callId}: ${error.message}`);
    return false;
  }
}

/**
 * Fetch call data using the same method as the main application
 */
async function fetchCallData(callId) {
  try {
    const token = await getApiToken();
    
    // First try to get from active calls
    const activeCallsResponse = await axios({
      method: 'GET',
      url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (activeCallsResponse.data?.Data) {
      const call = activeCallsResponse.data.Data.find(c => c.CallId.toString() === callId.toString());
      if (call) {
        return call;
      }
    }
    
    // If not found in active calls, try individual call fetch
    const callResponse = await axios({
      method: 'GET',
      url: `https://api.resgrid.com/api/v4/Calls/GetCall`,
      params: { callId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return callResponse.data?.Data || null;
  } catch (error) {
    logger.error(`Error fetching call data for ${callId}: ${error.message}`);
    return null;
  }
}

/**
 * Test endpoint - GET /test/:callId
 */
router.get('/test/:callId', async (req, res) => {
  const { callId } = req.params;
  
  try {
    logger.info(`Starting test for call ${callId}`);
    
    // Step 1: Initialize test
    await updateTestResult(callId, 'initializing');
    await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for visibility
    
    // Step 2: Authenticate with Resgrid
    await updateTestResult(callId, 'authenticating');
    const token = await getApiToken();
    if (!token) {
      await updateTestResult(callId, 'failed', 'Failed to get Resgrid API token');
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get Resgrid API token',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Fetch call data from Resgrid
    await updateTestResult(callId, 'fetching');
    const callData = await fetchCallData(callId);
    if (!callData) {
      await updateTestResult(callId, 'failed', 'Call not found in Resgrid');
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found in Resgrid',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Fetch extra call data
    await updateTestResult(callId, 'processing');
    const extraData = await getCallExtraData(callId);
    if (!extraData) {
      await updateTestResult(callId, 'failed', 'Failed to fetch call extra data');
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch call extra data',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 5: Generate XML
    await updateTestResult(callId, 'generating');
    const xmlResult = await generateXML(callData, extraData);
    const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    if (!xml || xml.length === 0) {
      await updateTestResult(callId, 'failed', 'XML generation failed');
      return res.status(500).json({ 
        success: false, 
        error: 'XML generation failed',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 6: Validate XML structure
    await updateTestResult(callId, 'validating');
    const hasRequiredFields = xml.includes('<IncidentNumber>') && 
                             xml.includes('<IncidentOrOnset>') &&
                             xml.includes('<DispatchNotified>');
    
    if (!hasRequiredFields) {
      await updateTestResult(callId, 'failed', 'XML missing required fields');
      return res.status(500).json({ 
        success: false, 
        error: 'Generated XML missing required fields',
        callId,
        xml: xml.substring(0, 500) + '...'
      });
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 7: Update Google Sheets
    await updateTestResult(callId, 'updating');
    try {
      const testCallData = { ...callData };
      testCallData.testCall = `Test - ${new Date().toISOString()}`;
      
      await sheetCallRow(testCallData, extraData, 'TEST SUCCESS', '', xml);
    } catch (sheetError) {
      logger.warn(`Google Sheets update failed during test: ${sheetError.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 8: Test completed successfully
    await updateTestResult(callId, 'success');
    
    res.json({ 
      success: true, 
      message: `Test completed successfully for call ${callId}`,
      callId,
      xmlLength: xml.length,
      hasUnits: xml.includes('<Unit>'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Test failed for call ${callId}: ${error.message}`);
    await updateTestResult(callId, 'failed', error.message);
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      callId 
    });
  }
});

/**
 * Test status endpoint - GET /test/:callId/status
 */
router.get('/test/:callId/status', async (req, res) => {
  const { callId } = req.params;
  
  try {
    const { google } = require('googleapis');
    
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get test result
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B:AK',
    });

    const data = dataResponse.data.values || [];
    for (let i = 1; i < data.length; i++) {
      if (data[i] && data[i][0] === callId) {
        const testResult = data[i][35] || ''; // Test Result column (AK is index 35 from B)
        return res.json({ 
          callId, 
          testResult,
          hasResult: testResult.trim() !== ''
        });
      }
    }

    res.status(404).json({ 
      success: false, 
      error: 'Call not found',
      callId 
    });

  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      callId 
    });
  }
});

module.exports = router;