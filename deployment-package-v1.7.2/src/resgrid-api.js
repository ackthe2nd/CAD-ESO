/**
 * Resgrid API client with automatic token refresh
 */
const { apiClient } = require('./token-manager');
const { logger } = require('./logger');

/**
 * Get detailed call data for a specific call ID
 * @param {string} callId - The ID of the call to fetch
 * @returns {Promise<Object>} The call data
 */
async function getCallExtraData(callId) {
  try {
    logger.info(`Fetching extra data for Call ID: ${callId}`);
    
    const response = await apiClient.get('Calls/GetCallExtraData', {
      params: { callId }
    });
    
    logger.debug(`Successfully retrieved data for Call ID: ${callId}`);
    return response.data;
  } catch (error) {
    logger.error(`Failed to fetch call data for Call ID: ${callId}`, { 
      error: error.message,
      callId,
      statusCode: error.response?.status
    });
    
    // Rethrow for the caller to handle
    throw error;
  }
}

/**
 * Get recent calls within a specified timeframe
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} List of calls
 */
async function getRecentCalls(days = 7) {
  try {
    logger.info(`Fetching calls from the last ${days} days`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates for API
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    logger.info(`Date range: ${startDateStr} to ${endDateStr}`);
    
    // First try: Use GetCallsInDateRange endpoint
    try {
      const response = await apiClient.get('Calls/GetCallsInDateRange', {
        params: {
          startDate: startDateStr,
          endDate: endDateStr
        }
      });
      
      if (Array.isArray(response.data)) {
        logger.info(`Retrieved ${response.data.length} calls from date range ${startDateStr} to ${endDateStr}`);
        return response.data;
      }
    } catch (dateRangeError) {
      logger.warn(`Failed with GetCallsInDateRange: ${dateRangeError.message}, trying fallback method`);
    }
    
    // Fallback: Try Active calls endpoint
    try {
      logger.info('Trying fallback to Active calls endpoint');
      const response = await apiClient.get('Calls/Active');
      
      if (Array.isArray(response.data)) {
        logger.info(`Retrieved ${response.data.length} active calls as fallback`);
        return response.data;
      }
    } catch (activeCalls) {
      logger.warn(`Failed with Active calls endpoint: ${activeCalls.message}`);
    }
    
    // If we get here, all attempts failed but we want to return gracefully
    logger.warn('All methods to fetch calls failed, returning empty array');
    return [];
  } catch (error) {
    logger.error(`Failed to fetch recent calls`, { 
      error: error.message,
      days,
      statusCode: error.response?.status
    });
    
    // Return empty array instead of rethrowing to allow the process to continue
    return [];
  }
}

/**
 * Get units available for dispatch
 * @returns {Promise<Array>} List of units
 */
async function getUnits() {
  try {
    logger.info('Fetching available units');
    
    const response = await apiClient.get('Units/GetAllUnitsForSystem');
    
    if (Array.isArray(response.data)) {
      logger.info(`Retrieved ${response.data.length} units`);
      return response.data;
    } else {
      logger.warn('Unexpected response format from GetAllUnitsForSystem endpoint');
      return [];
    }
  } catch (error) {
    logger.error(`Failed to fetch units`, { 
      error: error.message,
      statusCode: error.response?.status
    });
    
    // Rethrow for the caller to handle
    throw error;
  }
}

module.exports = { getCallExtraData, getRecentCalls, getUnits };