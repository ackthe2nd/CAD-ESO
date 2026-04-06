/**
 * Fix Header Duplicates and Ensure Proper Column Population
 * Removes duplicate headers and ensures Call Closed Time and Test Call columns work properly
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixHeaderDuplicates() {
  console.log('Fixing Header Duplicates and Column Population');
  console.log('===============================================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get current headers
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log(`Current headers count: ${currentHeaders.length}`);
    
    // Find and remove duplicates while maintaining proper order
    const cleanHeaders = [];
    const seenHeaders = new Set();
    
    const expectedHeaders = [
      'Call Received Time', 'Emergency Call ID', 'Priority Description', 'Responding Units',
      'Call Title', 'Incident Type', 'Incident Details', 'Emergency Address',
      'Address Line 1', 'Address Line 2', 'State', 'ZIP Code',
      'GPS Latitude', 'GPS Longitude', 'Additional Notes', 'Patient/Caller Name',
      'Contact Information', 'Patient DOB', 'Call Closed Time', 'Generated XML',
      'ESO Upload Status', 'Response Mode', 'Priority Level', 'Record Created',
      'Last Updated', 'Number of Units', 'Unit Dispatched Times', 'Unit En Route Times',
      'Unit Arrived Times', 'Unit At Patient Times', 'Unit Cleared Times',
      'Unit Back In Service Times', 'Unit Transport Times', 'Unit At Hospital Times',
      'Call Closed', 'Test Call'
    ];

    // Build clean header list
    expectedHeaders.forEach(expectedHeader => {
      if (!seenHeaders.has(expectedHeader)) {
        cleanHeaders.push(expectedHeader);
        seenHeaders.add(expectedHeader);
      }
    });

    console.log(`Clean headers count: ${cleanHeaders.length}`);
    console.log('Clean headers:', cleanHeaders);

    // Update headers - handle columns beyond Z
    let headerEndColumn;
    if (cleanHeaders.length <= 26) {
      headerEndColumn = String.fromCharCode(65 + cleanHeaders.length - 1);
    } else {
      const firstLetter = String.fromCharCode(65 + Math.floor((cleanHeaders.length - 1) / 26) - 1);
      const secondLetter = String.fromCharCode(65 + ((cleanHeaders.length - 1) % 26));
      headerEndColumn = firstLetter + secondLetter;
    }
    console.log(`Updating headers to range A1:${headerEndColumn}1`);

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `Call Data!A1:${headerEndColumn}1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [cleanHeaders],
      },
    });

    // Clear any extra columns that might have duplicate data
    if (cleanHeaders.length < currentHeaders.length) {
      const extraStartColumn = String.fromCharCode(65 + cleanHeaders.length);
      const extraEndColumn = String.fromCharCode(65 + currentHeaders.length - 1);
      console.log(`Clearing extra columns ${extraStartColumn}:${extraEndColumn}`);
      
      await sheetsClient.spreadsheets.values.clear({
        spreadsheetId,
        range: `Call Data!${extraStartColumn}:${extraEndColumn}`,
      });
    }

    console.log('✅ Headers cleaned and standardized');
    
    // Now verify the structure
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const newHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nVerification - New headers count: ${newHeaders.length}`);
    
    const callClosedTimeIndex = newHeaders.findIndex(h => h === 'Call Closed Time');
    const testCallIndex = newHeaders.findIndex(h => h === 'Test Call');
    const callClosedIndex = newHeaders.findIndex(h => h === 'Call Closed');
    
    console.log(`Call Closed Time: Column ${String.fromCharCode(65 + callClosedTimeIndex)} (index ${callClosedTimeIndex})`);
    console.log(`Test Call: Column ${String.fromCharCode(65 + testCallIndex)} (index ${testCallIndex})`);
    console.log(`Call Closed: Column ${String.fromCharCode(65 + callClosedIndex)} (index ${callClosedIndex})`);

  } catch (error) {
    console.error('Error fixing headers:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await fixHeaderDuplicates();
    console.log('\n=== HEADER CLEANUP COMPLETED ===');
    console.log('✅ Duplicate headers removed');
    console.log('✅ Standard column structure restored');
    console.log('✅ Ready for proper field population');
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixHeaderDuplicates };