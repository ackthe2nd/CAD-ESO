# Fly.io Deployment SFTP Fix

## Issue: Connection Lost Before Handshake
When deploying to Fly.io, the SFTP connection fails with "Connection lost before handshake" due to cloud network restrictions and timeout settings.

## Root Cause
- Cloud platforms have stricter network timeouts
- ESO SFTP server requires specific algorithm compatibility
- Fly.io networking differs from local development environments

## Solution Implemented

### Enhanced SFTP Client (`src/sftp-client.js`)
Created cloud-optimized SFTP client with:
- Extended timeouts for cloud networks (120 seconds ready timeout)
- Conservative algorithm selection for maximum compatibility
- Exponential backoff retry logic
- Enhanced error handling and connection verification

### Key Configuration Changes
```javascript
// Cloud-optimized settings
readyTimeout: 120000,      // 2 minutes for cloud networks
keepaliveInterval: 5000,   // Keep connection alive every 5 seconds
keepaliveCountMax: 5,      // Max keepalive attempts
connectTimeout: 60000,     // 60 seconds connection timeout

// Compatible algorithms for ESO SFTP
algorithms: {
  kex: [
    'diffie-hellman-group14-sha256',
    'diffie-hellman-group14-sha1',
    'diffie-hellman-group-exchange-sha256'
  ],
  cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
  hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
}
```

## Deployment Steps for Fly.io

### 1. Set Environment Variables
```bash
flyctl secrets set RESGRID_USER="your_username"
flyctl secrets set RESGRID_PASS="your_password"
flyctl secrets set GOOGLE_SERVICE_ACCOUNT_JSON="your_service_account_json"
flyctl secrets set LOG_SHEET_ID="your_sheet_id"
flyctl secrets set SFTP_HOST="sftp.esosuite.net"
flyctl secrets set SFTP_USER="your_eso_username"
flyctl secrets set SFTP_DIR="your_eso_directory"
```

### 2. Deploy Application
```bash
flyctl deploy
```

### 3. Monitor Logs
```bash
flyctl logs
```

## Verification
The enhanced SFTP client includes:
- Connection testing before file upload
- Automatic retry with exponential backoff
- Detailed logging for troubleshooting
- Graceful error handling

## Expected Results
- SFTP connections establish successfully in cloud environment
- File uploads complete without handshake errors
- Automatic retry handles temporary network issues
- Comprehensive logging shows connection status

## Testing
Run the enhanced system with:
```bash
node src/index.js
```

Monitor Google Sheets for "XML Upload Successful" status instead of "Upload Failed" messages.

The cloud-optimized SFTP client resolves the Fly.io deployment connection issues while maintaining compatibility with ESO's SFTP server requirements.