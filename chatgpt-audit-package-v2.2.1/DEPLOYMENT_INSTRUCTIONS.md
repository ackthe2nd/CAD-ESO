# Resgrid to ESO Bridge - Deployment Instructions

I've created a fixed version of the application that uses the correct API endpoints for your environment. The updated package includes:

## What's Been Fixed

1. Corrected API endpoint usage:
   - Using `GetActiveCalls` as primary method (confirmed working in your environment)
   - Using `GetCallsInDateRange` as fallback with correct parameters
   - Using `GetCallExtraData` to fetch additional call details with proper parameter formatting

2. Improved error handling:
   - Better logging of endpoint responses
   - Graceful fallback between endpoints
   - Client-side date filtering when needed

## Deployment Files

I've created a final deployment package: `resgrid-eso-bridge-deployment-final.tar.gz` (96KB)

## Deployment Instructions

### Option 1: Local Installation

1. Download `resgrid-eso-bridge-deployment-final.tar.gz`
2. Extract the contents:
   ```
   tar -xzf resgrid-eso-bridge-deployment-final.tar.gz -C /path/to/destination
   ```
3. Set up your environment variables in `.env`
   ```
   RESGRID_USER=your_username
   RESGRID_PASS=your_password
   SFTP_HOST=sftp.esosuite.net
   SFTP_USER=CAD_12345
   SFTP_PASS=your_sftp_password
   SFTP_DIR=/incoming
   ```
4. Run the application:
   ```
   node listener.js
   ```
5. Process existing calls using the working script:
   ```
   node working-fetch-calls.js --days=7
   ```

### Option 2: Fly.io Deployment

1. Download `resgrid-eso-bridge-deployment-final.tar.gz`
2. Extract the contents: 
   ```
   tar -xzf resgrid-eso-bridge-deployment-final.tar.gz
   ```
3. Set up your secrets in Fly.io:
   ```
   fly secrets set RESGRID_USER=your_username RESGRID_PASS=your_password SFTP_HOST=sftp.esosuite.net SFTP_USER=CAD_12345 SFTP_PASS=your_sftp_password
   ```
4. Deploy to Fly.io:
   ```
   fly deploy
   ```

## Testing The Installation

After deployment, you can test that everything is working properly:

1. Process recent calls with the working script:
   ```
   node working-fetch-calls.js --days=7
   ```

2. To listen for new calls:
   ```
   node listener.js
   ```

## Detailed Improvements in the Fixed Version

The `working-fetch-calls.js` script includes:

1. Proper parameter formats for all API endpoints
2. More verbose logging to help diagnose issues
3. Better error handling for unexpected API responses
4. Multiple fallback methods to improve reliability

## If Problems Persist

If you continue to encounter issues:

1. Verify your credentials are correct
2. Check the API endpoints directly with your browser or a tool like Postman
3. Look at detailed logs to pinpoint exactly which endpoint is failing
4. Contact Resgrid support if necessary to confirm API access