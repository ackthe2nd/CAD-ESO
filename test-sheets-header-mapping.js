/**
 * Test Google Sheets Header Mapping
 * Verifies that the corrected header structure works properly with data mapping
 */

require('dotenv').config();
const { google } = require('googleapis');

async function testSheetsHeaderMapping() {
  try {
    console.log('Testing Google Sheets header mapping after duplicate fix...');

    // Initialize Google Sheets authentication
    let auth;
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON not found');
    }

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get current headers
    console.log('Fetching current headers from Google Sheets...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log(`Found ${currentHeaders.length} headers in Google Sheets`);

    // Expected headers after fix
    const expectedHeaders = [
      'Call Received Time', 'Emergency Call ID', 'Priority Description', 'Responding Units', 'Call Title', 'Incident Type',
      'Incident Details', 'Emergency Address', 'Address Line 1', 'Address Line 2', 'State', 'ZIP Code',
      'GPS Latitude', 'GPS Longitude', 'Additional Notes', 'Patient/Caller Name', 'Contact Information', 'Patient DOB',
      'Call Closed Time', 'Generated XML', 'ESO Upload Status', 'Response Mode', 'Priority Level',
      'Record Created', 'Last Updated', 'Number of Units', 'Unit Dispatched Times', 'Unit En Route Times',
      'Unit Arrived Times', 'Unit At Patient Times', 'Unit Cleared Times', 'Unit Back In Service Times',
      'Unit Transport Times', 'Unit At Hospital Times', 'Call Closed'
    ];

    console.log(`Expected ${expectedHeaders.length} headers`);

    // Verify header structure
    let structureValid = true;
    const issues = [];

    if (currentHeaders.length !== expectedHeaders.length) {
      structureValid = false;
      issues.push(`Header count mismatch: expected ${expectedHeaders.length}, found ${currentHeaders.length}`);
    }

    // Check for exact matches
    expectedHeaders.forEach((expectedHeader, index) => {
      if (currentHeaders[index] !== expectedHeader) {
        structureValid = false;
        issues.push(`Position ${index + 1}: expected "${expectedHeader}", found "${currentHeaders[index] || 'MISSING'}"`);
      }
    });

    // Check for duplicates
    const headerCounts = {};
    currentHeaders.forEach((header, index) => {
      if (headerCounts[header]) {
        structureValid = false;
        issues.push(`Duplicate header "${header}" at positions ${headerCounts[header]} and ${index + 1}`);
      } else {
        headerCounts[header] = index + 1;
      }
    });

    // Test header mapping functionality
    console.log('\nTesting header mapping functionality...');
    const headerMappings = {
      'Call Received Time': 'callReceivedTime',
      'Emergency Call ID': 'callId',
      'Priority Description': 'priorityDescription',
      'Responding Units': 'units',
      'Call Title': 'callTitle',
      'Incident Type': 'incidentType',
      'Call Closed Time': 'closedOn',
      'Call Closed': 'callClosed'
    };

    const mapping = {};
    currentHeaders.forEach((header, index) => {
      const fieldName = headerMappings[header];
      if (fieldName) {
        mapping[fieldName] = index;
      }
    });

    console.log('Header mapping results:');
    Object.keys(headerMappings).forEach(header => {
      const fieldName = headerMappings[header];
      const columnIndex = mapping[fieldName];
      const status = columnIndex !== undefined ? `Column ${columnIndex + 1}` : 'NOT FOUND';
      console.log(`  ${header} -> ${fieldName}: ${status}`);
    });

    // Report results
    console.log('\n=================================');
    console.log('HEADER STRUCTURE VALIDATION');
    console.log('=================================');
    
    if (structureValid) {
      console.log('✅ Header structure is valid');
      console.log('✅ No duplicate headers found');
      console.log('✅ All expected headers are present in correct positions');
      console.log('✅ Header mapping functionality verified');
    } else {
      console.log('❌ Header structure has issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    }

    console.log('\nCurrent header structure:');
    currentHeaders.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });

    return structureValid;

  } catch (error) {
    console.error('Error testing header mapping:', error.message);
    return false;
  }
}

async function main() {
  console.log('Google Sheets Header Mapping Test');
  console.log('=================================');
  
  const success = await testSheetsHeaderMapping();
  
  if (success) {
    console.log('\n✅ Header mapping test passed');
    console.log('Google Sheets structure is ready for proper data mapping');
  } else {
    console.log('\n❌ Header mapping test failed');
    console.log('Google Sheets structure needs additional fixes');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testSheetsHeaderMapping };