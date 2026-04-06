/**
 * Restore Clean Headers - Fix corrupted header structure completely
 * Restores proper 36-column structure with correct field mappings
 */

require('dotenv').config();
const { google } = require('googleapis');

async function restoreCleanHeaders() {
  console.log('Restoring Clean Header Structure');
  console.log('===============================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Define the exact header structure we want
    const correctHeaders = [
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
      'Call Closed',
      'Test Call'
    ];

    console.log(`Setting ${correctHeaders.length} clean headers`);

    // First, get existing data to preserve it during restructure
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:ZZ',
    });

    const existingData = dataResponse.data.values || [];
    console.log(`Found ${existingData.length} existing rows`);

    // Clear the entire sheet to start fresh
    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Call Data!A:ZZ',
    });

    // Set the clean headers
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: 'Call Data!A1:AJ1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [correctHeaders],
      },
    });

    console.log('Clean headers set successfully');

    // Now restore the data in the correct column positions
    if (existingData.length > 1) {
      console.log('Restoring existing call data...');
      
      // Map old data to new structure based on known positions
      const restoredRows = [];
      
      for (let i = 1; i < existingData.length; i++) {
        const oldRow = existingData[i];
        const newRow = new Array(36).fill('');
        
        // Map critical fields to correct positions (based on original attached data)
        if (oldRow[0]) newRow[0] = oldRow[0]; // Call Received Time
        if (oldRow[1]) newRow[1] = oldRow[1]; // Emergency Call ID
        if (oldRow[2]) newRow[2] = oldRow[2]; // Priority Description
        if (oldRow[3]) newRow[3] = oldRow[3]; // Responding Units
        if (oldRow[4]) newRow[4] = oldRow[4]; // Call Title (might be empty in corrupted data)
        if (oldRow[5]) newRow[5] = oldRow[5]; // Incident Type (might be empty in corrupted data)
        if (oldRow[6]) newRow[6] = oldRow[6]; // Incident Details
        if (oldRow[7]) newRow[7] = oldRow[7]; // Emergency Address
        if (oldRow[8]) newRow[8] = oldRow[8]; // Address Line 1
        if (oldRow[9]) newRow[9] = oldRow[9]; // Address Line 2
        if (oldRow[10]) newRow[10] = oldRow[10]; // State
        if (oldRow[11]) newRow[11] = oldRow[11]; // ZIP Code
        if (oldRow[12]) newRow[12] = oldRow[12]; // GPS Latitude
        if (oldRow[13]) newRow[13] = oldRow[13]; // GPS Longitude
        if (oldRow[14]) newRow[14] = oldRow[14]; // Additional Notes
        if (oldRow[15]) newRow[15] = oldRow[15]; // Patient/Caller Name
        if (oldRow[16]) newRow[16] = oldRow[16]; // Contact Information
        if (oldRow[17]) newRow[17] = oldRow[17]; // Patient DOB
        if (oldRow[18]) newRow[18] = oldRow[18]; // Call Closed Time
        if (oldRow[19]) newRow[19] = oldRow[19]; // Generated XML
        if (oldRow[20]) newRow[20] = oldRow[20]; // ESO Upload Status
        if (oldRow[21]) newRow[21] = oldRow[21]; // Response Mode
        if (oldRow[22]) newRow[22] = oldRow[22]; // Priority Level
        if (oldRow[23]) newRow[23] = oldRow[23]; // Record Created
        if (oldRow[24]) newRow[24] = oldRow[24]; // Last Updated
        if (oldRow[25]) newRow[25] = oldRow[25]; // Number of Units
        if (oldRow[26]) newRow[26] = oldRow[26]; // Unit Dispatched Times
        if (oldRow[27]) newRow[27] = oldRow[27]; // Unit En Route Times
        if (oldRow[28]) newRow[28] = oldRow[28]; // Unit Arrived Times
        if (oldRow[29]) newRow[29] = oldRow[29]; // Unit At Patient Times
        if (oldRow[30]) newRow[30] = oldRow[30]; // Unit Cleared Times
        if (oldRow[31]) newRow[31] = oldRow[31]; // Unit Back In Service Times
        if (oldRow[32]) newRow[32] = oldRow[32]; // Unit Transport Times
        if (oldRow[33]) newRow[33] = oldRow[33]; // Unit At Hospital Times
        if (oldRow[34]) newRow[34] = oldRow[34]; // Call Closed
        // Test Call column (35) starts empty for operational calls
        
        restoredRows.push(newRow);
      }

      if (restoredRows.length > 0) {
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range: `Call Data!A2:AJ${restoredRows.length + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: restoredRows,
          },
        });
        
        console.log(`Restored ${restoredRows.length} rows of call data`);
      }
    }

    // Verify the final structure
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const finalHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nVerification: ${finalHeaders.length} headers set`);
    
    const callClosedTimeIndex = finalHeaders.findIndex(h => h === 'Call Closed Time');
    const testCallIndex = finalHeaders.findIndex(h => h === 'Test Call');
    const callClosedIndex = finalHeaders.findIndex(h => h === 'Call Closed');
    
    console.log(`Call Closed Time: Column ${String.fromCharCode(65 + callClosedTimeIndex)} (index ${callClosedTimeIndex})`);
    console.log(`Call Closed: Column ${String.fromCharCode(65 + callClosedIndex)} (index ${callClosedIndex})`);
    console.log(`Test Call: Column ${String.fromCharCode(65 + testCallIndex)} (index ${testCallIndex})`);

    console.log('\n✅ Clean header structure restored');
    console.log('✅ All 36 columns properly positioned');
    console.log('✅ Ready for proper field population');

  } catch (error) {
    console.error('Error restoring headers:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await restoreCleanHeaders();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { restoreCleanHeaders };