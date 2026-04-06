/**
 * Test Google Sheets Secret Configuration
 * 
 * This script tests if the Google Sheets authentication is properly configured
 * using any of the three supported methods.
 */
require('dotenv').config();
const fs = require('fs');
const { google } = require('googleapis');

// Set up console colors for better readability
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Logger function for better output
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const color = 
    level === 'info' ? colors.cyan :
    level === 'success' ? colors.green :
    level === 'warn' ? colors.yellow :
    level === 'error' ? colors.red :
    colors.reset;
  
  console.log(`${color}${timestamp} [${level}]:${colors.reset} ${message}`);
}

// Test if the configuration is valid
async function testConfiguration() {
  log('Starting Google Sheets authentication test...');
  
  // Check for Replit Secret method
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.LOG_SHEET_ID) {
    log('Found Replit Secret configuration method', 'info');
    try {
      // Parse the JSON
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      
      // Log some safe info about the credentials
      log(`Client email: ${credentials.client_email.substring(0, 10)}...`, 'info');
      log(`Project ID: ${credentials.project_id}`, 'info');
      
      // Verify critical fields
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Service account JSON is missing required fields (client_email or private_key)');
      }
      
      // Try to initialize auth
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      // Try to get client
      const client = await auth.getClient();
      log('Successfully authenticated with Google using Replit Secret', 'success');
      return true;
    } catch (error) {
      log(`Replit Secret method failed: ${error.message}`, 'error');
      log('Full error:', 'error');
      console.error(error);
    }
  } else {
    log('Replit Secret method not configured', 'info');
  }
  
  // Check for legacy methods
  log('Checking legacy auth methods...', 'info');
  
  // Check for base64 method
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    log('Found base64 configuration method', 'info');
    try {
      let base64String = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
      
      // Add padding if needed
      while (base64String.length % 4 !== 0) {
        base64String += '=';
      }
      
      // Remove any non-base64 characters
      base64String = base64String.replace(/[^A-Za-z0-9+/=]/g, '');
      
      const jsonContent = Buffer.from(base64String, 'base64').toString('utf-8');
      
      // Log first few characters
      log(`Decoded JSON starts with: ${jsonContent.substring(0, 20)}...`, 'info');
      
      // Parse the JSON
      const credentials = JSON.parse(jsonContent);
      
      // Verify critical fields
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Base64 decoded service account JSON is missing required fields');
      }
      
      // Try to initialize auth
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      // Try to get client
      const client = await auth.getClient();
      log('Successfully authenticated with Google using Base64 method', 'success');
      return true;
    } catch (error) {
      log(`Base64 method failed: ${error.message}`, 'error');
      
      // Log more detailed info about the base64 string
      const base64String = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
      log(`Base64 string length: ${base64String.length}`, 'info');
      log(`Base64 string first 30 chars: ${base64String.substring(0, 30)}`, 'info');
      
      // Try to decode to see what's wrong
      try {
        const decodedBytes = Buffer.from(base64String, 'base64');
        log(`Decoded ${decodedBytes.length} bytes`, 'info');
        log(`First 20 bytes as hex: ${decodedBytes.slice(0, 20).toString('hex')}`, 'info');
      } catch (decodeError) {
        log(`Couldn't decode base64: ${decodeError.message}`, 'error');
      }
    }
  } else {
    log('Base64 method not configured', 'info');
  }
  
  // Check for key file method
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    log(`Found key file configuration method: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH}`, 'info');
    try {
      const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
      
      // Check if file exists
      if (!fs.existsSync(keyFilePath)) {
        throw new Error(`Key file not found at: ${keyFilePath}`);
      }
      
      // Try to read and parse file
      const fileContent = fs.readFileSync(keyFilePath, 'utf8');
      const credentials = JSON.parse(fileContent);
      
      // Log some safe info
      log(`Client email: ${credentials.client_email.substring(0, 10)}...`, 'info');
      log(`Project ID: ${credentials.project_id}`, 'info');
      
      // Verify critical fields
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Key file is missing required fields');
      }
      
      // Try to initialize auth
      const auth = new google.auth.GoogleAuth({
        keyFile: keyFilePath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      // Try to get client
      const client = await auth.getClient();
      log('Successfully authenticated with Google using key file method', 'success');
      return true;
    } catch (error) {
      log(`Key file method failed: ${error.message}`, 'error');
    }
  } else {
    log('Key file method not configured', 'info');
  }
  
  // If we get here, all methods failed
  log('All authentication methods failed or not configured', 'error');
  log('Please check the documentation in SETTING_UP_GOOGLE_SHEETS_SECRET.md', 'info');
  return false;
}

// Check if LOG_SHEET_ID is set
function checkSheetId() {
  if (!process.env.LOG_SHEET_ID) {
    log('LOG_SHEET_ID is not set. Make sure to set this environment variable.', 'error');
    return false;
  }
  
  log(`LOG_SHEET_ID is set: ${process.env.LOG_SHEET_ID}`, 'success');
  return true;
}

// Main function
async function main() {
  log('=== Google Sheets Authentication Test ===', 'info');
  
  const authSuccess = await testConfiguration();
  const sheetIdSuccess = checkSheetId();
  
  if (authSuccess && sheetIdSuccess) {
    log('✅ Google Sheets authentication is properly configured!', 'success');
  } else {
    log('❌ Google Sheets authentication test failed', 'error');
    log('Please fix the issues above to enable Google Sheets logging', 'info');
  }
}

// Run the test
main().catch(error => {
  log(`Unhandled error in test: ${error.message}`, 'error');
  console.error(error);
});