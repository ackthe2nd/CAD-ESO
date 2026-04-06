/**
 * Fix Test Columns with Correct Sheet ID
 * Adds test functionality with proper sheet targeting
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixTestColumnsSheetId() {
  console.log('Adding Test Columns with Correct Sheet ID');
  console.log('========================================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get spreadsheet info to find the correct sheet ID for Call Data
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

    // Get current data and extend columns if needed
    const currentProperties = callDataSheet.properties.gridProperties;
    console.log(`Current grid: ${currentProperties.rowCount} rows x ${currentProperties.columnCount} columns`);

    if (currentProperties.columnCount < 37) {
      console.log('Expanding sheet to accommodate new columns...');
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [{
            updateSheetProperties: {
              properties: {
                sheetId: sheetId,
                gridProperties: {
                  rowCount: currentProperties.rowCount,
                  columnCount: 37 // Ensure we have enough columns
                }
              },
              fields: 'gridProperties.columnCount'
            }
          }]
        }
      });
      console.log('Sheet expanded successfully');
    }

    // Update headers to include Test Result column
    const targetHeaders = [
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

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: 'Call Data!A1:AK1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [targetHeaders],
      },
    });

    console.log('Headers updated with Test Result column');

    // Get existing call data to add test buttons
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B2:B100', // Emergency Call ID column
    });

    const callIds = dataResponse.data.values || [];
    console.log(`Found ${callIds.length} existing calls`);

    if (callIds.length > 0) {
      const testButtonRows = [];
      for (let i = 0; i < callIds.length; i++) {
        const callId = callIds[i] && callIds[i][0] ? callIds[i][0] : '';
        if (callId && callId.trim() !== '') {
          // Create test button with simple text format since HYPERLINK might cause issues
          testButtonRows.push([`🧪 Test ${callId}`, '']); // Test button in AJ, empty result in AK
        } else {
          testButtonRows.push(['', '']); // Empty for rows without call ID
        }
      }

      if (testButtonRows.length > 0) {
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range: `Call Data!AJ2:AK${testButtonRows.length + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: testButtonRows,
          },
        });
        
        console.log(`Added test buttons for ${testButtonRows.length} calls`);
      }
    }

    // Apply formatting using the correct sheet ID
    console.log('Applying column formatting...');
    
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Format Test Call column (AJ) - center align and blue text
          {
            repeatCell: {
              range: {
                sheetId: sheetId, // Use the correct sheet ID
                startColumnIndex: 35, // AJ column (0-indexed)
                endColumnIndex: 36,
                startRowIndex: 1 // Skip header
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  textFormat: {
                    foregroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(horizontalAlignment,textFormat)'
            }
          },
          // Format Test Result column (AK) - center align
          {
            repeatCell: {
              range: {
                sheetId: sheetId, // Use the correct sheet ID
                startColumnIndex: 36, // AK column (0-indexed)
                endColumnIndex: 37,
                startRowIndex: 1 // Skip header
              },
              cell: {
                userEnteredFormat: {
                  horizontalAlignment: 'CENTER',
                  textFormat: {
                    bold: true
                  }
                }
              },
              fields: 'userEnteredFormat(horizontalAlignment,textFormat)'
            }
          },
          // Set column widths
          {
            updateDimensionProperties: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 35, // AJ column
                endIndex: 36
              },
              properties: {
                pixelSize: 150
              },
              fields: 'pixelSize'
            }
          },
          {
            updateDimensionProperties: {
              range: {
                sheetId: sheetId,
                dimension: 'COLUMNS',
                startIndex: 36, // AK column
                endIndex: 37
              },
              properties: {
                pixelSize: 120
              },
              fields: 'pixelSize'
            }
          }
        ]
      }
    });

    console.log('Column formatting applied successfully');

    // Verify final structure
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const finalHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nFinal verification: ${finalHeaders.length} headers`);
    
    const testCallIndex = finalHeaders.findIndex(h => h === 'Test Call');
    const testResultIndex = finalHeaders.findIndex(h => h === 'Test Result');
    
    console.log(`Test Call: Column ${String.fromCharCode(65 + testCallIndex)} (index ${testCallIndex})`);
    console.log(`Test Result: Column ${String.fromCharCode(65 + testResultIndex)} (index ${testResultIndex})`);

    console.log('\n✅ Test functionality added successfully');
    console.log('✅ Test Call buttons created for existing calls');
    console.log('✅ Test Result column ready to track success/failure');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await fixTestColumnsSheetId();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixTestColumnsSheetId };