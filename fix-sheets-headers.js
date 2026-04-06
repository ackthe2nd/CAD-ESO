/**
 * Fix Google Sheets Headers - Remove Extra Columns and Fix Field Mapping
 * Ensures all 37 columns are properly mapped without extra columns
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixSheetsHeaders() {
  console.log('Fixing Google Sheets Headers and Field Mapping');
  console.log('==============================================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get Call Data sheet info
    const spreadsheetInfo = await sheetsClient.spreadsheets.get({
      spreadsheetId,
    });

    const callDataSheet = spreadsheetInfo.data.sheets.find(
      sheet => sheet.properties.title === 'Call Data'
    );

    if (!callDataSheet) {
      throw new Error('Call Data sheet not found');
    }

    const sheetId = callDataSheet.properties.sheetId;
    console.log(`Found Call Data sheet ID: ${sheetId}`);

    // Check current headers
    const currentHeadersResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const currentHeaders = currentHeadersResponse.data.values?.[0] || [];
    console.log(`Current headers count: ${currentHeaders.length}`);
    console.log('Current headers:', currentHeaders.slice(0, 10).join(', '), '...');

    // Define the correct 37 headers in proper order
    const correctHeaders = [
      'Call Received Time', 'Emergency Call ID', 'Priority Description', 'Responding Units',
      'Call Title', 'Incident Type', 'Incident Details', 'Emergency Address',
      'Address Line 1', 'Address Line 2', 'State', 'ZIP Code',
      'GPS Latitude', 'GPS Longitude', 'Additional Notes', 'Patient/Caller Name',
      'Contact Information', 'Patient DOB', 'Call Closed Time', 'Generated XML',
      'ESO Upload Status', 'Response Mode', 'Priority Level', 'Record Created',
      'Last Updated', 'Number of Units', 'Unit Dispatched Times', 'Unit En Route Times',
      'Unit Arrived Times', 'Unit At Patient Times', 'Unit Cleared Times', 'Unit Back In Service Times',
      'Unit Transport Times', 'Unit At Hospital Times', 'Call Closed', 'Test Call', 'Test Result'
    ];

    console.log(`Target headers count: ${correctHeaders.length}`);

    // Clear and set correct headers
    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: 'Call Data!A1:AK1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [correctHeaders],
      },
    });

    console.log('✅ Headers updated successfully');

    // Ensure sheet has correct number of columns
    const currentProperties = callDataSheet.properties.gridProperties;
    if (currentProperties.columnCount !== 37) {
      console.log(`Adjusting sheet columns from ${currentProperties.columnCount} to 37`);
      
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            updateSheetProperties: {
              properties: {
                sheetId: sheetId,
                gridProperties: {
                  rowCount: currentProperties.rowCount,
                  columnCount: 37
                }
              },
              fields: 'gridProperties.columnCount'
            }
          }]
        }
      });
    }

    // Apply header formatting
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          {
            repeatCell: {
              range: {
                sheetId: sheetId,
                startRowIndex: 0,
                endRowIndex: 1,
                startColumnIndex: 0,
                endColumnIndex: 37
              },
              cell: {
                userEnteredFormat: {
                  backgroundColor: { red: 0.9, green: 0.9, blue: 0.9 },
                  textFormat: {
                    bold: true,
                    fontSize: 10
                  },
                  horizontalAlignment: 'CENTER'
                }
              },
              fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
            }
          }
        ]
      }
    });

    console.log('✅ Header formatting applied');

    // Verify final structure
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const finalHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nFinal verification: ${finalHeaders.length} headers`);
    
    if (finalHeaders.length === 37) {
      console.log('✅ All 37 headers properly configured');
      console.log('Column mapping:');
      console.log('  A: Call Received Time');
      console.log('  B: Emergency Call ID');
      console.log('  D: Responding Units');
      console.log('  E: Call Title');
      console.log('  F: Incident Type');
      console.log('  ...');
      console.log('  AJ: Test Call');
      console.log('  AK: Test Result');
    } else {
      console.log(`❌ Header count mismatch: ${finalHeaders.length} instead of 37`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await fixSheetsHeaders();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixSheetsHeaders };