const axios = require('axios');
const { config } = require('./config');
const { logger } = require('./logger');
const { getApiToken } = require('./token-manager');

// Create axios instance with base configuration (token will be added per request)
const apiClient = axios.create({
  baseURL: config.resgrid.apiUrl,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  timeout: 10000 // 10 seconds timeout
});

/**
 * Fetches additional call data from the Resgrid API
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object|null>} - The call data or null if an error occurred
 */
async function fetchCallExtraData(callId) {
  try {
    logger.info(`Fetching extra data for Call ID: ${callId}`);
    
    // Get a valid token first
    const token = await getApiToken();
    if (!token) {
      logger.error(`Failed to obtain API token for Call ID: ${callId}`);
      return null;
    }
    
    logger.debug(`API token obtained successfully, making API call for call data`);
    
    const response = await apiClient.get(`/Calls/GetCallExtraData`, {
      params: { callId },
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.status === 200 && response.data) {
      logger.info(`Successfully fetched data for Call ID: ${callId}`);
      return response.data;
    } else {
      logger.warn(`Unexpected response for Call ID: ${callId}, Status: ${response.status}`);
      return null;
    }
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      logger.error(`API Error for Call ID: ${callId}, Status: ${error.response.status}`, {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      // The request was made but no response was received
      logger.error(`API Request failed for Call ID: ${callId}, No response received`, {
        error: error.message
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      logger.error(`API Request setup failed for Call ID: ${callId}`, {
        error: error.message
      });
    }
    
    return null;
  }
}

module.exports = { fetchCallExtraData };
