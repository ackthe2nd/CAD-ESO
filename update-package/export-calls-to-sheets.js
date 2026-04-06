/**
 * Resgrid to Google Sheets Export Utility
 * 
 * This script fetches active or recent calls from Resgrid API
 * and logs them to Google Sheets without generating XML files.
 * 
 * Usage:
 *   node export-calls-to-sheets.js [--active] [--days=N]
 *   --active: Export only active calls (default: false)
 *   --days=N: Look back N days for recent calls (default: 7, ignored if --active is set)
 */
require('dotenv').config();
const axios = require('axios');
const { logger } = require('./src/logger');
const tokenManager = require('./src/token-manager');
const sheetsLogger = require('./src/sheets-logger');

// Parse command line arguments
const args = process.argv.slice(2);
const activeOnly = args.includes('--active');
const daysArg = args.find(arg => arg.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;

/**
 * Main function to export calls to Google Sheets
 */
async function main() {
  try {
    logger.info('Resgrid to Google Sheets Export - Starting...');
    
    // Get an API token
    const token = await tokenManager.getToken();
    if (!token) {
      logger.error('Failed to obtain API token.');
      process.exit(1);
    }
    logger.info('Successfully obtained API token.');
    
    // Fetch calls based on the selected mode
    let calls = [];
    if (activeOnly) {
      calls = await fetchActiveCalls(token);
      logger.info(`Fetched ${calls.length} active calls.`);
    } else {
      calls = await fetchRecentCalls(token, days);
      logger.info(`Fetched ${calls.length} calls from the last ${days} days.`);
    }
    
    if (calls.length === 0) {
      logger.info('No calls found to export.');
      return;
    }
    
    // Process each call
    logger.info(`Starting export of ${calls.length} calls to Google Sheets...`);
    let processed = 0;
    
    for (const call of calls) {
      try {
        // Get extra data for the call
        const callExtraData = await getCallExtraData(token, call.CallId);
        
        // Log to Google Sheets
        const success = await sheetsLogger.sheetCallRow(call, callExtraData);
        
        if (success) {
          processed++;
          logger.info(`Exported call ${call.CallId} to Google Sheets (${processed}/${calls.length})`);
        } else {
          logger.error(`Failed to export call ${call.CallId} to Google Sheets`);
        }
      } catch (error) {
        logger.error(`Error processing call ${call.CallId}: ${error.message}`);
      }
    }
    
    logger.info(`Export completed. Successfully exported ${processed} out of ${calls.length} calls.`);
  } catch (error) {
    logger.error(`Export failed: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Fetch active calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @returns {Promise<Array>} List of active calls
 */
async function fetchActiveCalls(token) {
  try {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/Active', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    logger.error(`Failed to fetch active calls: ${error.message}`);
    return [];
  }
}

/**
 * Fetch recent calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {number} days - How many days back to fetch calls for
 * @returns {Promise<Array>} List of calls
 */
async function fetchRecentCalls(token, days) {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates for API
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    logger.info(`Fetching calls from date range: ${startDateStr} to ${endDateStr}`);
    
    // First try: Use GetCallsInDateRange endpoint
    try {
      const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallsInDateRange`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          startDate: startDateStr,
          endDate: endDateStr
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        logger.info(`Retrieved ${response.data.length} calls from date range ${startDateStr} to ${endDateStr}`);
        return response.data;
      }
    } catch (dateRangeError) {
      logger.warn(`Failed with GetCallsInDateRange: ${dateRangeError.message}, trying fallback method`);
    }
    
    // Fallback: Try Active calls endpoint
    try {
      logger.info('Trying fallback to Active calls endpoint');
      const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/Active`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.data && Array.isArray(response.data)) {
        logger.info(`Retrieved ${response.data.length} active calls as fallback`);
        return response.data;
      }
    } catch (activeCallsError) {
      logger.warn(`Failed with Active calls endpoint: ${activeCallsError.message}`);
    }
    
    // If we get here, all attempts failed
    logger.warn('All methods to fetch calls failed, returning empty array');
    return [];
  } catch (error) {
    logger.error(`Failed to fetch recent calls: ${error.message}`);
    return [];
  }
}

/**
 * Fetches detailed call data from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object>} The detailed call data
 */
async function getCallExtraData(token, callId) {
  try {
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        callId: callId
      }
    });
    
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch extra data for call ${callId}: ${error.message}`);
    return {};
  }
}

// Run the main function
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});