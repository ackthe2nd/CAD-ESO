# SFTP Handshake Issue Resolution

## Problem
The ResgridESOBridge was experiencing "Connection lost before handshake" errors when attempting to upload XML files to ESO's SFTP server (sftp.esosuite.net).

## Root Cause Analysis
Comprehensive diagnostics revealed that:
- DNS resolution: WORKING
- TCP connection: WORKING
- Minimal SFTP connection: WORKING
- Complex SFTP configuration: FAILING

The issue was caused by overly complex SFTP connection parameters that conflicted with ESO's server configuration.

## Solution
Simplified the SFTP connection configuration to use only essential parameters:

### Before (Complex Configuration)
```javascript
await sftp.connect({
  host: config.sftp.host,
  port: config.sftp.port,
  username: config.sftp.username,
  password: config.sftp.password,
  retries: 3,
  retry_factor: 2,
  retry_minTimeout: 2000,
  readyTimeout: 45000,
  timeout: 45000,
  forceIPv4: true,
  keepaliveInterval: 30000,
  keepaliveCountMax: 3,
  algorithms: {
    kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
    cipher: ['aes128-ctr', 'aes128-gcm', 'aes256-ctr'],
    hmac: ['hmac-sha2-256', 'hmac-sha1'],
    compress: ['none']
  }
  // ... additional complex parameters
});
```

### After (Simplified Configuration)
```javascript
await sftp.connect({
  host: config.sftp.host,
  port: config.sftp.port,
  username: config.sftp.username,
  password: config.sftp.password,
  readyTimeout: 20000,
  timeout: 20000
});
```

## Verification Results
- Single connection test: SUCCESS
- Upload test: SUCCESS  
- File verification: SUCCESS
- Connection cleanup: SUCCESS

## Implementation
The fix has been applied to:
- `src/sftp-client.js` - Main SFTP client module
- Production deployment package updated

## Impact
- Eliminates "Connection lost before handshake" errors
- Improves upload reliability
- Reduces connection overhead
- Maintains full compatibility with ESO processing requirements

## Date
June 7, 2025

## Status
VERIFIED AND DEPLOYED