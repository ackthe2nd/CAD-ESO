const axios = require('axios');
const { config } = require('./config');
const { logger } = require('./logger');

// Module-level variables for token caching
let apiToken = null;
let tokenExpiry = 0;

/**
 * Gets a valid Resgrid API token, refreshing if necessary
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  // If we have a token and it's still valid (with 60 seconds buffer)
  if (apiToken && Date.now() < tokenExpiry - 60000) {
    logger.debug('Using cached API token');
    return apiToken;
  }
  
  logger.info('Fetching new Resgrid API token...');
  
  const username = config.resgrid.user;
  const password = config.resgrid.pass;
  
  logger.debug(`Using username: ${username}`);
  
  const requestData = {
    username,
    password
  };
  
  // Try multiple endpoints to find which one works
  const endpoints = [
    'https://api.resgrid.com/api/v4/Connect/token',
    'https://api.resgrid.com/api/v3/Connect/token',
    'https://api.resgrid.com/api/v4/Authentication/Login',
    'https://api.resgrid.com/api/v4/Authenticate/login'
  ];
  
  logger.debug(`Will try ${endpoints.length} possible authentication endpoints`);
  
  let lastError = null;
  let response = null;
  
  try {
    // Try each endpoint
    for (const endpoint of endpoints) {
      logger.debug(`Attempting authentication with endpoint: ${endpoint}`);
      
      try {
        if (endpoint.includes('Token') || endpoint.includes('token')) {
          // OAuth style endpoint
          const formData = new URLSearchParams();
          formData.append('grant_type', 'password');
          formData.append('username', username);
          formData.append('password', password);
          
          response = await axios.post(
            endpoint,
            formData,
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              }
            }
          );
        } else {
          // JSON style endpoint
          response = await axios.post(
            endpoint,
            requestData,
            {
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
              }
            }
          );
        }
        
        logger.debug(`Response from ${endpoint}: Status ${response.status}`);
        
        if (response.status === 200) {
          logger.info(`Successfully authenticated with endpoint: ${endpoint}`);
          break;
        }
      } catch (error) {
        lastError = error;
        logger.debug(`Authentication failed with endpoint ${endpoint}: ${error.message}`);
        // Continue to next endpoint
      }
    }
    
    if (!response || response.status !== 200) {
      if (lastError) {
        logger.error(`All authentication attempts failed. Last error: ${lastError.message}`);
        throw lastError;
      } else {
        logger.error('All authentication attempts failed with non-200 status codes');
        throw new Error('Authentication failed');
      }
    }
    
    // At this point we have a successful response
    if (response.data && response.data.access_token) {
      logger.info('Successfully obtained new API token');
      
      // Store the token and calculate expiry time
      apiToken = response.data.access_token;
      
      // Convert expiresIn (seconds) to milliseconds and calculate expiry timestamp
      const expiresInMs = (response.data.expires_in || 3600) * 1000;
      tokenExpiry = Date.now() + expiresInMs;
      
      return apiToken;
    } else {
      logger.error('Failed to obtain API token: Unexpected response format');
      throw new Error('Failed to obtain API token: Invalid response');
    }
  } catch (error) {
    logger.error(`Failed to obtain API token: ${error.message}`);
    if (error.response) {
      logger.error(`API Error, Status: ${error.response.status}`, {
        status: error.response.status,
        data: error.response.data
      });
    } else if (error.request) {
      logger.error('No response received', {
        error: error.message
      });
    }
    throw error;
  }
}

// Initialize the token on module load (but don't block)
getApiToken().catch(err => {
  logger.error(`Initial token fetch failed: ${err.message}`);
});

module.exports = { getApiToken };