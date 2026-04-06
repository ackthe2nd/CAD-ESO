# Resgrid-ESO Bridge Version 1.4.3 Summary

This version includes several improvements focused on Google Sheets integration, deployment enhancements, and documentation updates.

## New Features

### 1. Enhanced Google Sheets Export
- Added `export-calls-to-sheets-enhanced.js` that exports comprehensive call data to Google Sheets
- Includes XML content preview in column D for data verification
- Automatically creates and formats the "Calls" sheet with proper headers

### 2. Improved Deployment Process
- Updated Dockerfile to include Google Sheets integration files
- Added environment variables for Google Sheets in deployment configuration
- Created new deployment package for v1.4.3 with all updated files

### 3. Fly.io Deployment Support
- Added detailed guide in `DEPLOYING_TO_FLY_IO.md`
- Created `prepare-google-service-account.js` utility to help with base64 encoding credentials
- Enhanced sheets-logger.js to support multiple credential formats:
  - Direct JSON in GOOGLE_SERVICE_ACCOUNT_JSON
  - Base64 encoded in GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  - File path in GOOGLE_SERVICE_ACCOUNT_KEY_PATH

## Technical Improvements

### 1. Google Sheets Integration
- Added proper sheet creation with headers when the "Calls" sheet doesn't exist
- Fixed sheet naming issues from "Sheet1" to "Calls"
- Added comprehensive field mapping to match XML format
- Improved error handling for Google API authentication

### 2. API Enhancements
- Maintained all previously fixed API endpoint improvements
- Enhanced token refresh and error handling
- Improved unit status detection and mapping

## Documentation Updates

### 1. New Documentation Files
- `GOOGLE_SHEETS_EXPORT_GUIDE.md` - Detailed guide for the enhanced export functionality
- `DEPLOYING_TO_FLY_IO.md` - Step-by-step guide for Fly.io deployment

### 2. Updated Documentation
- `FIELD_MAPPING_REFERENCE.md` - Updated with Google Sheets column mappings
- `VERSION_SUMMARY_V1.4.3.md` - This document summarizing all changes

## Deployment Package

The new deployment package `resgrid-eso-bridge-deployment-v1.4.3.tar.gz` includes:
- All source code files with Google Sheets integration
- Documentation files including new deployment guides
- Updated Dockerfile and fly.toml configuration

## How to Deploy

### Option 1: Fly.io Deployment
Follow the instructions in `DEPLOYING_TO_FLY_IO.md` for deploying to Fly.io with Google Sheets integration.

### Option 2: Local Deployment
1. Extract the deployment package
2. Copy the `.env.example` to `.env` and fill in your credentials
3. Run `npm install`
4. Start the application with `node listener.js`

## Google Sheets Integration Setup

1. Set up a Google Service Account and download the credentials JSON file
2. Share your Google Sheet with the service account email
3. Set the `LOG_SHEET_ID` environment variable to your Google Sheet ID
4. Set up the service account credentials using one of these methods:
   - Set `GOOGLE_SERVICE_ACCOUNT_JSON` with the full JSON content
   - Set `GOOGLE_SERVICE_ACCOUNT_JSON_BASE64` with base64-encoded JSON
   - Save the JSON file and set `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`

See `GOOGLE_SHEETS_EXPORT_GUIDE.md` for detailed instructions.