/**
 * Token Manager for Resgrid API
 * Handles authentication and token refresh
 */
const axios = require('axios');
const querystring = require('querystring');
const { logger } = require('./logger');
const { config } = require('./config');

// Module-level variables for token caching
let cachedToken = null;
let tokenExpiry = 0;
const TOKEN_REFRESH_MARGIN = 900000; // Refresh token 15 minutes before expiry (increased from 5 minutes)

/**
 * Creates an Axios instance with interceptors for automatic token refresh
 */
const apiClient = axios.create({
  baseURL: config.resgrid.baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

/**
 * Add request interceptor to add Authorization header
 */
apiClient.interceptors.request.use(async (requestConfig) => {
  // Skip adding auth token for token endpoint itself
  if (requestConfig.url.includes(config.resgrid.tokenEndpoint)) {
    return requestConfig;
  }
  
  // Get a valid token (refreshed if needed)
  const token = await getApiToken();
  
  // Add to request headers
  requestConfig.headers.Authorization = `Bearer ${token}`;
  return requestConfig;
}, (error) => {
  return Promise.reject(error);
});

/**
 * Add response interceptor to handle 401 errors
 */
apiClient.interceptors.response.use((response) => {
  return response;
}, async (error) => {
  const originalRequest = error.config;
  
  // Only retry once to prevent infinite loops
  if (error.response && error.response.status === 401 && !originalRequest._retry) {
    logger.warn('Received 401 error, refreshing token and retrying request');
    
    // Mark as retried
    originalRequest._retry = true;
    
    // Force token refresh
    cachedToken = null;
    tokenExpiry = 0;
    
    try {
      // Get a fresh token
      const token = await getApiToken(true);
      
      // Update the request
      originalRequest.headers.Authorization = `Bearer ${token}`;
      
      // Retry the request
      return apiClient(originalRequest);
    } catch (refreshError) {
      logger.error('Failed to refresh token after 401 error', { error: refreshError.message });
      return Promise.reject(refreshError);
    }
  }
  
  return Promise.reject(error);
});

/**
 * Gets a valid Resgrid API token, refreshing if necessary
 * @param {boolean} forceRefresh - Force a new token even if cached one exists
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken(forceRefresh = false) {
  // Return cached token if it's still valid (with margin)
  const now = Date.now();
  
  if (!forceRefresh && cachedToken && tokenExpiry > now + TOKEN_REFRESH_MARGIN) {
    // Don't log anything for cached token to reduce log noise
    return cachedToken;
  }
  
  // If token exists but is getting close to expiry, only log at debug level
  if (!forceRefresh && cachedToken && tokenExpiry > now) {
    logger.debug('Token nearing expiry, refreshing proactively');
  } else {
    // Only log token fetch at info level when we don't have a token or it's expired
    logger.info('Fetching new Resgrid API token...');
  }
  
  try {
    // POST to token endpoint to get new token
    const tokenResponse = await axios({
      method: 'post',
      url: `${config.resgrid.baseUrl}/${config.resgrid.tokenEndpoint}`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: querystring.stringify({
        grant_type: 'password',
        username: config.resgrid.username,
        password: config.resgrid.password
      })
    });
    
    // Extract token and expiry
    const { access_token, expires_in } = tokenResponse.data;
    
    if (!access_token) {
      throw new Error('No access_token in response');
    }
    
    // Don't log success if we're just refreshing a still-valid token
    const isRenewal = cachedToken && tokenExpiry > now;
    
    // Cache the token
    cachedToken = access_token;
    
    // Calculate expiry time (convert expires_in from seconds to milliseconds)
    // Set expiry further in the future (30 minutes instead of standard 5)
    tokenExpiry = now + (expires_in * 1000);
    
    if (!isRenewal) {
      logger.info('Successfully obtained new API token');
    } else {
      logger.debug('Successfully refreshed API token');
    }
    
    return access_token;
  } catch (error) {
    logger.error('Failed to obtain API token', {
      error: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    // Fallback to legacy endpoint if available
    if (!forceRefresh) {
      try {
        return await getLegacyApiToken();
      } catch (legacyError) {
        logger.error('Failed to obtain API token using legacy method', {
          error: legacyError.message
        });
      }
    }
    
    throw error;
  }
}

/**
 * Legacy method to get an API token (fallback)
 * @returns {Promise<string>} A valid API token
 */
async function getLegacyApiToken() {
  logger.info('Attempting to obtain token via legacy endpoint...');
  
  try {
    const response = await axios({
      method: 'post',
      url: `${config.resgrid.baseUrl}/Tokens/GetPersonnelToken`,
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify({
        username: config.resgrid.username,
        password: config.resgrid.password
      })
    });
    
    if (response.data && response.data.Token) {
      cachedToken = response.data.Token;
      
      // Set expiry to 24 hours from now as legacy endpoint doesn't provide expiry
      tokenExpiry = Date.now() + (24 * 60 * 60 * 1000);
      
      logger.info('Successfully obtained token via legacy endpoint');
      
      return cachedToken;
    } else {
      throw new Error('Invalid response from legacy token endpoint');
    }
  } catch (error) {
    logger.error('Failed to obtain token via legacy endpoint', {
      error: error.message,
      status: error.response?.status
    });
    throw error;
  }
}

module.exports = { getApiToken, apiClient };