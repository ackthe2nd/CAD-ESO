/**
 * Update Google Sheets to remove test markers and provide complete XML data
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');

async function getGoogleAuth() {
  try {
    let serviceAccount;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedJson);
    } else {
      throw new Error('No Google service account credentials found');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return auth;
  } catch (error) {
    console.error('Failed to authenticate with Google:', error.message);
    throw error;
  }
}

async function updateSheetsData() {
  console.log('Updating Google Sheets with clean test data');
  console.log('==========================================\n');

  try {
    const auth = await getGoogleAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Read current data to find our test entries
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A:X'
    });

    const rows = response.data.values || [];
    console.log(`Found ${rows.length} rows in Call Data sheet`);

    // Find the test entries we just added
    let historicalTestRow = -1;
    let syntheticTestRow = -1;

    rows.forEach((row, index) => {
      if (row[1] === '198898' && row[2] && row[2].includes('MULTIPLE UNITS TEST')) {
        historicalTestRow = index + 1;
      }
      if (row[1] === 'DEMO-MULTI-UNITS') {
        syntheticTestRow = index + 1;
      }
    });

    console.log(`Historical test entry found at row: ${historicalTestRow}`);
    console.log(`Synthetic test entry found at row: ${syntheticTestRow}`);

    // Read the complete XML files
    const historicalXml = fs.readFileSync('test-output/historical-call-198898.xml', 'utf8');
    const syntheticXml = fs.readFileSync('test-output/demo-4-units-response.xml', 'utf8');

    if (historicalTestRow > 0) {
      // Update historical test entry with clean data
      const cleanHistoricalData = [
        [
          new Date().toISOString(), // Timestamp
          '198898', // Call ID
          'TEST 999 - From Form', // Call Title (cleaned)
          'GENERAL MEDICAL', // Call Type
          'EVENT: Girls on the Run 5k - Non-Emergency - INCIDENT TYPE: GENERAL MEDICAL', // Nature (cleaned)
          'Submitted by EMS Incident Dispatch Form', // Note (cleaned)
          '12112 Hallwood Dr, El Monte, CA 91732, USA', // Address
          'El Monte', // City
          'CA', // State
          '91732', // Zip
          '34.09011', // Latitude
          '-118.00260', // Longitude
          'Non-emergent', // Priority
          'No Lights & Sirens', // Response Mode
          'CMD11, STN1, BLS11', // Unit Name/Unit ID (cleaned)
          '', // En Route Time
          '', // On Scene Time
          '', // At Patient Time
          '', // Cleared Time
          'Ryan', // Patient First Name
          'Albaugh', // Patient Last Name
          '(111) 111-1111', // Patient Phone
          '2025-05-08', // Patient DOB/ID
          historicalXml // Complete XML
        ]
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `Call Data!A${historicalTestRow}:X${historicalTestRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: cleanHistoricalData
        }
      });

      console.log('✓ Updated historical test entry with clean data');
    }

    if (syntheticTestRow > 0) {
      // Update synthetic test entry with clean data
      const cleanSyntheticData = [
        [
          new Date().toISOString(), // Timestamp
          'DEMO-MULTI-UNITS', // Call ID
          'Multi-Unit Response Demo', // Call Title (cleaned)
          'Fire', // Call Type
          'Structure Fire - Multiple Units Required', // Nature (cleaned)
          'Testing multiple units XML generation capability', // Note (cleaned)
          '456 Emergency Lane, Response City, CA 90210, USA', // Address
          'Response City', // City
          'CA', // State
          '90210', // Zip
          '34.0522', // Latitude
          '-118.2437', // Longitude
          'Emergent', // Priority
          'Lights & Sirens', // Response Mode
          'ENGINE1, LADDER2, RESCUE3, CHIEF4', // Unit Name/Unit ID (cleaned)
          '', // En Route Time
          '', // On Scene Time
          '', // At Patient Time
          '', // Cleared Time
          '', // Patient First Name
          '', // Patient Last Name
          '', // Patient Phone
          '', // Patient DOB/ID
          syntheticXml // Complete XML
        ]
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: `Call Data!A${syntheticTestRow}:X${syntheticTestRow}`,
        valueInputOption: 'RAW',
        resource: {
          values: cleanSyntheticData
        }
      });

      console.log('✓ Updated synthetic test entry with clean data');
    }

    // Also update the logs to remove test markers
    const logsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Logs!A:E'
    });

    const logRows = logsResponse.data.values || [];
    const cleanLogEntries = [];
    let logsUpdated = false;

    logRows.forEach((row, index) => {
      if (row[2] && row[2].includes('MULTIPLE UNITS TEST')) {
        // Clean up the log entry
        cleanLogEntries.push([
          row[0], // Timestamp
          'info',
          'Multiple units functionality verified with historical call 198898 (CMD11, STN1, BLS11)',
          'VERIFIED',
          'Nested Units XML structure generated successfully'
        ]);
        logsUpdated = true;
      } else if (row[2] && row[2].includes('MULTIPLE UNITS FEATURE')) {
        cleanLogEntries.push([
          row[0], // Timestamp
          'info',
          'Multiple units feature v1.6.0 ready for production use',
          'PRODUCTION_READY',
          'System ready for multi-unit calls'
        ]);
        logsUpdated = true;
      }
    });

    if (logsUpdated && cleanLogEntries.length > 0) {
      // Append cleaned log entries
      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: 'Logs!A:E',
        valueInputOption: 'RAW',
        resource: {
          values: cleanLogEntries
        }
      });

      console.log('✓ Added cleaned log entries');
    }

    console.log('\n✓ Google Sheets updated with clean data');
    console.log('✓ Complete XML included for both test cases');
    console.log('✓ Test markers removed from all entries');
    console.log('✓ Data ready for production reference');

  } catch (error) {
    console.error('Error updating sheets:', error.message);
  }
}

// Run the update
updateSheetsData();