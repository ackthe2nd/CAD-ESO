# Token Refresh Mechanism in Resgrid-ESO Bridge

This document explains the automatic token refresh mechanism implemented in the Resgrid-ESO Bridge application.

## Overview

The Resgrid-ESO Bridge uses token-based authentication to communicate with the Resgrid API. The application implements a robust token management system that automatically handles:

1. **Initial Authentication**: Obtaining a token from username/password credentials
2. **Token Expiration**: Detecting and refreshing tokens before they expire
3. **Error Recovery**: Detecting 401 errors and refreshing tokens automatically
4. **Alternative Endpoints**: Falling back to different authentication endpoints if needed

## Authentication Flow

### Initial Authentication

When the application starts, it authenticates with the Resgrid API using the provided credentials:

```javascript
async function getApiToken() {
  try {
    // First check if we have a cached, non-expired token
    if (tokenCache.token && tokenCache.expiresAt && new Date() < tokenCache.expiresAt) {
      logger.debug('Using cached token');
      return tokenCache.token;
    }

    logger.info('Fetching new Resgrid API token...');
    
    // Otherwise, request a new token
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      'grant_type=password&username=' + encodeURIComponent(process.env.RESGRID_USER) + 
      '&password=' + encodeURIComponent(process.env.RESGRID_PASS),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    
    // Extract and cache the token
    const token = response.data.access_token;
    const expiresIn = response.data.expires_in;
    
    // Calculate expiration time with a 5-minute buffer
    const expiresAt = new Date(new Date().getTime() + (expiresIn - 300) * 1000);
    
    // Update token cache
    tokenCache.token = token;
    tokenCache.expiresAt = expiresAt;
    
    logger.info('Successfully obtained new API token');
    return token;
  } catch (error) {
    // Handle authentication errors
    logger.error(`Error getting API token: ${error.message}`);
    
    // Try alternative authentication endpoint if primary fails
    return tryAlternativeAuthentication();
  }
}
```

### Token Caching

The application caches the token and its expiration time to avoid unnecessary authentication requests:

```javascript
// Token cache
const tokenCache = {
  token: null,
  expiresAt: null
};
```

The cache includes:
- The token itself
- The expiration time (with a 5-minute buffer for safety)

### Automatic Renewal

The application automatically refreshes the token before it expires:

1. Before using a cached token, it checks if the token is close to expiration
2. If the token will expire within 5 minutes, it proactively requests a new one
3. This prevents service interruptions due to token expiration

### Error Recovery

If an API request fails with a 401 Unauthorized error, the token is automatically refreshed:

```javascript
async function callResgridApi(endpoint, method = 'get', data = null) {
  try {
    const token = await getApiToken();
    const response = await axios({
      method,
      url: `https://api.resgrid.com/api/v4/${endpoint}`,
      headers: {
        'Authorization': `Bearer ${token}`
      },
      data
    });
    return response.data;
  } catch (error) {
    // Check if error is due to invalid token (401)
    if (error.response && error.response.status === 401) {
      logger.warn('Received 401 unauthorized, refreshing token and retrying...');
      
      // Force token refresh by clearing cache
      tokenCache.token = null;
      tokenCache.expiresAt = null;
      
      // Retry the request with a new token
      const newToken = await getApiToken();
      const response = await axios({
        method,
        url: `https://api.resgrid.com/api/v4/${endpoint}`,
        headers: {
          'Authorization': `Bearer ${newToken}`
        },
        data
      });
      return response.data;
    }
    
    // Re-throw other errors
    throw error;
  }
}
```

### Alternative Authentication Endpoints

If the primary authentication endpoint fails, the application tries alternative endpoints:

```javascript
async function tryAlternativeAuthentication() {
  try {
    logger.warn('Trying alternative authentication endpoint...');
    
    // Try the v3 token endpoint
    const response = await axios.post(
      'https://api.resgrid.com/api/v3/Account/Login',
      {
        Username: process.env.RESGRID_USER,
        Password: process.env.RESGRID_PASS,
        RememberMe: false
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const token = response.data.Token;
    
    // Set a 1-hour expiration for tokens from alternative endpoint
    const expiresAt = new Date(new Date().getTime() + 55 * 60 * 1000);
    
    tokenCache.token = token;
    tokenCache.expiresAt = expiresAt;
    
    logger.info('Successfully obtained token from alternative endpoint');
    return token;
  } catch (error) {
    logger.error(`Alternative authentication failed: ${error.message}`);
    throw new Error('All authentication methods failed');
  }
}
```

## Implementation Details

### Token Manager Module (`src/token-manager.js`)

The token management functionality is encapsulated in a dedicated module:

```javascript
// Token Manager Module
const axios = require('axios');
const logger = require('./logger');

// Token cache with expiration
const tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Gets a valid Resgrid API token, refreshing if necessary
 * @returns {Promise<string>} A valid API token
 */
async function getToken() {
  // Implementation as described above
}

/**
 * Force refresh the token cache
 */
function invalidateToken() {
  tokenCache.token = null;
  tokenCache.expiresAt = null;
  logger.debug('Token cache invalidated');
}

/**
 * Check if a token is expired or close to expiration
 * @param {Date} expiresAt - Token expiration date
 * @returns {boolean} True if token is expired or will expire within 5 minutes
 */
function isTokenExpired(expiresAt) {
  if (!expiresAt) return true;
  
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
  
  return expiresAt <= fiveMinutesFromNow;
}

module.exports = {
  getToken,
  invalidateToken
};
```

### API Client Module (`src/resgrid-api.js`)

The API client uses the token manager to make authenticated requests:

```javascript
// Resgrid API Client
const axios = require('axios');
const tokenManager = require('./token-manager');
const logger = require('./logger');

/**
 * Makes an authenticated request to the Resgrid API
 * @param {string} endpoint - API endpoint path
 * @param {string} method - HTTP method (get, post, etc.)
 * @param {Object} data - Request body for POST/PUT requests
 * @returns {Promise<Object>} API response data
 */
async function callApi(endpoint, method = 'get', data = null) {
  try {
    const token = await tokenManager.getToken();
    const url = `https://api.resgrid.com/api/v4/${endpoint}`;
    
    logger.debug(`Making ${method.toUpperCase()} request to ${url}`);
    
    const response = await axios({
      method,
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data
    });
    
    return response.data;
  } catch (error) {
    // Handle 401 errors with token refresh
    if (error.response && error.response.status === 401) {
      logger.warn(`Received 401 unauthorized for ${endpoint}, refreshing token and retrying`);
      
      // Invalidate token and get a new one
      tokenManager.invalidateToken();
      const newToken = await tokenManager.getToken();
      
      // Retry with new token
      const response = await axios({
        method,
        url: `https://api.resgrid.com/api/v4/${endpoint}`,
        headers: {
          'Authorization': `Bearer ${newToken}`,
          'Content-Type': 'application/json'
        },
        data
      });
      
      return response.data;
    }
    
    // Log other errors
    logger.error(`API error for ${endpoint}: ${error.message}`);
    
    // Rethrow
    throw error;
  }
}

module.exports = {
  callApi,
  // Convenience methods
  get: (endpoint) => callApi(endpoint, 'get'),
  post: (endpoint, data) => callApi(endpoint, 'post', data),
  put: (endpoint, data) => callApi(endpoint, 'put', data),
  delete: (endpoint) => callApi(endpoint, 'delete')
};
```

## Error Handling

The token refresh mechanism includes comprehensive error handling:

1. **Network Errors**: Retries with exponential backoff
2. **Authentication Failures**: Tries alternative endpoints
3. **Token Invalidation**: Forces refresh on 401 errors
4. **Logging**: Records detailed error information

## Benefits

The automatic token refresh mechanism provides several benefits:

1. **Reduced Maintenance**: No need to manually refresh tokens
2. **Improved Reliability**: Prevents service disruptions due to expired tokens
3. **Better Error Recovery**: Automatically recovers from authentication errors
4. **Simplified Configuration**: Only needs username/password credentials

## Configuration

The token refresh mechanism is configured through environment variables:

```
# Resgrid API Authentication
RESGRID_USER=your_username
RESGRID_PASS=your_password
```

## Testing

To test the token refresh mechanism, run:

```bash
node test-token-refresh.js
```

This script:
1. Obtains an initial token
2. Simulates a token expiration
3. Verifies that a new token is obtained automatically
4. Simulates a 401 error
5. Verifies that token refresh and retry work correctly