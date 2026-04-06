# Version 1.4.7 Summary

## Overview

Version 1.4.7 enhances the Resgrid-ESO Bridge with improved logging capabilities for XML uploads, providing better visibility into the ESO upload process.

## Key Updates

1. **Enhanced XML Upload Logging**
   - Added XML content logging to Google Sheets when files are uploaded to ESO 
   - Added upload status tracking ("Success" or "Failed") for each XML upload
   - All uploads now appear in the Logs sheet with complete XML content for audit and troubleshooting

2. **Improved Error Tracking**
   - Failed uploads now log the complete XML that failed to upload
   - More detailed error information in the Google Sheets logs
   - Better visibility into upload issues without requiring server access

3. **Unit Name Handling Updates**
   - Enhanced unit name extraction from Resgrid API responses
   - Improved multiple unit name handling in XML output with comma separation
   - Better fallback mechanisms when unit name data is structured differently

## Configuration Changes

- Added two new columns to the Logs sheet:
  - **Status**: Records the status of the XML upload ("Success" or "Failed")
  - **XML**: Contains the complete XML content that was uploaded

## How to Verify

1. Check the Logs sheet in Google Sheets to see the new Status and XML columns
2. When new calls are processed, you should see XML upload entries with the full XML content
3. Any upload failures will be clearly marked with "Failed" status and include the XML that failed

## Deployment Instructions

Follow the standard deployment process:

1. Stop the current Resgrid-ESO Bridge service
2. Copy the deployment package to your server
3. Extract the deployment package
4. Update environment configuration if needed
5. Start the service using `node listener.js`

## Rollback Procedure

If issues arise, roll back to version 1.4.6:

1. Stop the 1.4.7 service
2. Restore the 1.4.6 deployment package
3. Restart the service