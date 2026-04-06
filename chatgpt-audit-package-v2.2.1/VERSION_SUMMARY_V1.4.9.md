# Resgrid-ESO Bridge: Version 1.4.9 Summary

**Release Date:** May 10, 2025

## Overview

Version 1.4.9 focuses on enhancing the Google Sheets integration to support the updated Resgrid API data structure. The application now properly extracts unit information and timestamps from the nested data format, ensuring accurate data logging even as the API evolves.

## Key Enhancements

### 1. Google Sheets Data Extraction Improvements
- Added support for accessing unit names and status timestamps from the newly nested API response structure
- Enhanced unit name extraction from the Activity array for improved accuracy
- Implemented fallback mechanisms for extracting unit information from dispatch notes
- Improved duplicate handling to provide clean, accurate unit listings

### 2. Nested Data Structure Support
- Updated all data extraction logic to handle the nested `Data` property in API responses
- Maintained backward compatibility with the previous API structure
- Enhanced debug logging for better visibility into data extraction processes

### 3. Code Stability Improvements
- Fixed variable declaration conflicts in sheets-logger.js
- Improved error handling for missing or empty data structures
- Added defensive code to handle varied API response formats

### 4. Documentation Updates
- Added comprehensive documentation for the nested data structure support
- Updated field mapping documentation to reflect current API patterns
- Enhanced logging documentation with examples of the updated console output

## Installation Instructions

1. Download the v1.4.9 deployment package
2. Extract the contents to your deployment directory
3. Update your `.env` file with necessary credentials
4. Start the service using `node listener.js`

## Configuration

No new environment variables are required for this update.

## Known Issues

- SFTP connection failures (these are expected in the test environment but would work in production)
- Some Resgrid API endpoints may still return 404/504 errors under certain conditions

## Compatibility

This version is compatible with the current Resgrid API (as of May 2025) and maintains backward compatibility with previous API versions.

---

**Note:** The application will automatically detect and adapt to the appropriate data structure format, so no special configuration is needed after upgrade.