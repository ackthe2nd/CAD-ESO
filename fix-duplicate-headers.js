/**
 * Fix Duplicate Headers in Google Sheets
 * This script removes the duplicate "Call Closed Time" header and corrects the column structure
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixDuplicateHeaders() {
  try {
    console.log('Fixing duplicate headers in Google Sheets...');

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

    if (!spreadsheetId) {
      throw new Error('LOG_SHEET_ID not found');
    }

    // Get current headers
    console.log('Getting current headers...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log(`Found ${currentHeaders.length} current headers`);
    
    // Check for any remaining duplicates
    const duplicateCheck = {};
    const foundDuplicates = [];
    currentHeaders.forEach((header, index) => {
      if (duplicateCheck[header]) {
        foundDuplicates.push(`"${header}" at positions ${duplicateCheck[header]} and ${index + 1}`);
      } else {
        duplicateCheck[header] = index + 1;
      }
    });
    
    if (foundDuplicates.length > 0) {
      console.log('Found remaining duplicates:', foundDuplicates);
    }

    // Define the correct header sequence without duplicates
    const correctedHeaders = [
      'Call Received Time',
      'Emergency Call ID', 
      'Priority Description',
      'Responding Units',
      'Call Title',
      'Incident Type',
      'Incident Details',
      'Emergency Address',
      'Address Line 1',
      'Address Line 2',
      'State',
      'ZIP Code',
      'GPS Latitude',
      'GPS Longitude',
      'Additional Notes',
      'Patient/Caller Name',
      'Contact Information',
      'Patient DOB',
      'Call Closed Time',
      'Generated XML',
      'ESO Upload Status',
      'Response Mode',
      'Priority Level',
      'Record Created',
      'Last Updated',
      'Number of Units',
      'Unit Dispatched Times',
      'Unit En Route Times',
      'Unit Arrived Times',
      'Unit At Patient Times',
      'Unit Cleared Times',
      'Unit Back In Service Times',
      'Unit Transport Times',
      'Unit At Hospital Times',
      'Call Closed'
    ];

    console.log(`Corrected header count: ${correctedHeaders.length}`);

    // Check for duplicates in corrected headers
    const headerCounts = {};
    correctedHeaders.forEach(header => {
      headerCounts[header] = (headerCounts[header] || 0) + 1;
    });

    const duplicates = Object.keys(headerCounts).filter(header => headerCounts[header] > 1);
    if (duplicates.length > 0) {
      console.log('ERROR: Duplicates still exist in corrected headers:', duplicates);
      return false;
    }

    console.log('No duplicates in corrected headers ✓');

    // Update the headers in Google Sheets
    console.log('Updating headers in Google Sheets...');
    let endColumn;
    if (correctedHeaders.length <= 26) {
      endColumn = String.fromCharCode(65 + correctedHeaders.length - 1);
    } else {
      // Handle columns beyond Z (AA, AB, etc.)
      const firstLetter = String.fromCharCode(65 + Math.floor((correctedHeaders.length - 1) / 26) - 1);
      const secondLetter = String.fromCharCode(65 + ((correctedHeaders.length - 1) % 26));
      endColumn = firstLetter + secondLetter;
    }
    
    console.log(`Updating range: Call Data!A1:${endColumn}1 (${correctedHeaders.length} columns)`);
    
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `Call Data!A1:${endColumn}1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [correctedHeaders],
      },
    });

    console.log('✅ Headers successfully updated');
    console.log('New header structure:');
    correctedHeaders.forEach((header, index) => {
      console.log(`  ${index + 1}. ${header}`);
    });

    return true;

  } catch (error) {
    console.error('Error fixing duplicate headers:', error.message);
    return false;
  }
}

async function main() {
  console.log('Google Sheets Header Fix Utility');
  console.log('=================================');
  
  const success = await fixDuplicateHeaders();
  
  if (success) {
    console.log('\n✅ Header fix completed successfully');
    console.log('The duplicate "Call Closed Time" header has been removed');
    console.log('Google Sheets now has the correct header structure');
  } else {
    console.log('\n❌ Header fix failed');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixDuplicateHeaders };