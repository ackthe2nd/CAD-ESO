# Token Management Optimization

## Overview

This document describes the optimizations made to the token management system to minimize API calls and reduce logging noise.

## Key Changes

### 1. Extended Token Refresh Margin

- **Previous**: Tokens were refreshed 5 minutes before expiry (300,000 ms)
- **New**: Tokens are now refreshed 15 minutes before expiry (900,000 ms)
- **Impact**: Reduced token refresh frequency by 3x

### 2. Intelligent Logging

- **Previous**: All token operations were logged at INFO level, including routine refreshes
- **New**: 
  - No logging for cached token reuse
  - DEBUG level for routine token refreshes
  - INFO level only for completely new tokens
- **Impact**: Significantly cleaner logs with fewer redundant entries

### 3. Smarter Refresh Logic

- **New**: Added distinction between proactive renewal and expired token replacement
- **Impact**: Better performance with fewer unnecessary token requests

## Implementation Details

The token manager now implements three distinct behaviors:

1. **Cached Token Reuse**:
   - When a token is still well within validity period
   - No logging occurs to reduce noise
   - No API calls made

2. **Proactive Token Renewal**:
   - When a token is still valid but approaching expiry
   - Logs at DEBUG level only
   - Makes API call but marks it as a renewal

3. **New Token Acquisition**:
   - When a token has expired or doesn't exist
   - Logs at INFO level for visibility
   - Makes API call and notes it's a fresh token

## Technical Implementation

```javascript
async function getApiToken(forceRefresh = false) {
  // Return cached token if it's still valid (with margin)
  const now = Date.now();
  
  if (!forceRefresh && cachedToken && tokenExpiry > now + TOKEN_REFRESH_MARGIN) {
    // Don't log anything for cached token to reduce log noise
    return cachedToken;
  }
  
  // Different logging based on whether we're refreshing proactively or getting new token
  if (!forceRefresh && cachedToken && tokenExpiry > now) {
    logger.debug('Token nearing expiry, refreshing proactively');
  } else {
    logger.info('Fetching new Resgrid API token...');
  }
  
  // Token acquisition logic
  // ...
  
  // Different success logging based on whether it was a renewal
  const isRenewal = cachedToken && tokenExpiry > now;
  if (!isRenewal) {
    logger.info('Successfully obtained new API token');
  } else {
    logger.debug('Successfully refreshed API token');
  }
}
```

## Expected Results

With these optimizations, you should see:

1. Fewer "Fetching new Resgrid API token..." messages in the logs
2. Longer intervals between token refresh operations
3. Cleaner logs with only important token operations visible at INFO level

## Troubleshooting

If you notice any issues with token authentication after these changes:

1. Check the logs for DEBUG level messages about token renewal
2. Look for 401 (Unauthorized) errors which would indicate a token refresh problem
3. Monitor the token expiry time to ensure it's being calculated correctly