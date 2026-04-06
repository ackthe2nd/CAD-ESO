/**
 * Fetch and Log Active Calls Utility
 * 
 * This script fetches active calls from Resgrid API and logs them to Google Sheets
 * without generating XML files. It uses the correct endpoints that work with the API.
 * 
 * Usage:
 *   node fetch-and-log-active-calls.js
 */
require('dotenv').config();
const axios = require('axios');
const { getApiToken } = require('./src/token-manager');
const { sheetCallRow } = require('./src/sheets-logger');
const logger = require('./src/fix-logger');

/**
 * Fetches active calls from the Working Resgrid API endpoint
 * This uses a different endpoint than the old GetActiveCalls which returns 404
 */
async function fetchActiveCalls(token) {
  try {
    logger.info('Fetching active calls from Resgrid API...');
    
    // Try the GetActiveCalls endpoint first (this works in the UnitMonitor script)
    try {
      logger.info('Trying Calls/GetActiveCalls endpoint...');
      
      const response = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.Data) {
        logger.info(`Found ${response.data.Data.length} active calls using GetActiveCalls`);
        return response.data.Data;
      } else {
        logger.warn('No active calls data returned from GetActiveCalls endpoint');
      }
    } catch (activecallsError) {
      logger.warn(`GetActiveCalls endpoint failed: ${activecallsError.message}`);
      logger.info('Falling back to GetCalls endpoint with date parameters...');
    }
    
    // Fall back to GetCalls with date parameters
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 7); // Look back 7 days
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = today.toISOString().split('T')[0];
    
    logger.info(`Searching for calls between ${startDateStr} and ${endDateStr}`);
    
    const response = await axios({
      method: 'GET',
      url: 'https://api.resgrid.com/api/v4/Calls/GetCalls',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate: startDateStr,
        endDate: endDateStr
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      logger.info(`Found ${response.data.length} active calls`);
      return response.data;
    } else {
      logger.warn('No active calls data returned from API');
      return [];
    }
  } catch (error) {
    logger.error(`Error fetching active calls: ${error.message}`);
    if (error.response) {
      logger.error(`Status code: ${error.response.status}`);
    }
    return [];
  }
}

/**
 * Fetches detailed call data using the Call ID
 */
async function getCallExtraData(token, callId) {
  try {
    logger.info(`Fetching extra data for call ${callId}...`);
    
    const response = await axios({
      method: 'GET',
      url: `https://api.resgrid.com/api/v4/Calls/GetCallExtraData`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        callId: callId
      }
    });
    
    if (response.data) {
      return response.data;
    } else {
      logger.warn(`No extra data returned for call ${callId}`);
      return null;
    }
  } catch (error) {
    logger.error(`Error fetching call extra data for ${callId}: ${error.message}`);
    if (error.response) {
      logger.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Main function to fetch active calls and log them to Google Sheets
 */
async function main() {
  try {
    // Get API token
    const token = await getApiToken();
    if (!token) {
      logger.error('Failed to get API token');
      return;
    }
    
    logger.info('Successfully obtained API token');
    
    // Fetch active calls
    const calls = await fetchActiveCalls(token);
    
    if (calls.length === 0) {
      logger.info('No active calls found');
      return;
    }
    
    logger.info(`Processing ${calls.length} active calls...`);
    
    // Process each call
    for (const call of calls) {
      try {
        logger.info(`Processing call ${call.CallId}: ${call.Name}`);
        
        // Fetch extra data
        const extraData = await getCallExtraData(token, call.CallId);
        
        // Log to Google Sheets
        if (extraData) {
          logger.info(`Logging call ${call.CallId} to Google Sheets...`);
          const success = await sheetCallRow(call, extraData);
          
          if (success) {
            logger.info(`Successfully logged call ${call.CallId} to Google Sheets`);
          } else {
            logger.error(`Failed to log call ${call.CallId} to Google Sheets`);
          }
        } else {
          logger.warn(`No extra data available for call ${call.CallId}, logging basic call data only`);
          const success = await sheetCallRow(call, {});
          
          if (success) {
            logger.info(`Successfully logged basic call ${call.CallId} to Google Sheets`);
          } else {
            logger.error(`Failed to log call ${call.CallId} to Google Sheets`);
          }
        }
      } catch (error) {
        logger.error(`Error processing call ${call.CallId}: ${error.message}`);
      }
    }
    
    logger.info('Finished processing active calls');
  } catch (error) {
    logger.error(`Unexpected error: ${error.message}`);
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});