/**
 * Add Test Call Button and Test Result Columns
 * Adds interactive test functionality to Google Sheets Call Data
 */

require('dotenv').config();
const { google } = require('googleapis');

async function addTestColumns() {
  console.log('Adding Test Call Button and Test Result Columns');
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

    // Get current sheet structure
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AK',
    });

    const data = dataResponse.data.values || [];
    const headers = data[0];
    console.log(`Current headers: ${headers.length}`);

    // Check if Test Call column exists and get its position
    const testCallIndex = headers.findIndex(h => h === 'Test Call');
    console.log(`Test Call column: ${testCallIndex >= 0 ? 'Column ' + String.fromCharCode(65 + testCallIndex) : 'Not found'}`);

    // Define the target structure with Test Call button and Test Result
    const targetHeaders = [
      'Call Received Time',          // A (0)
      'Emergency Call ID',           // B (1)
      'Priority Description',        // C (2)
      'Responding Units',            // D (3)
      'Call Title',                  // E (4)
      'Incident Type',               // F (5)
      'Incident Details',            // G (6)
      'Emergency Address',           // H (7)
      'Address Line 1',              // I (8)
      'Address Line 2',              // J (9)
      'State',                       // K (10)
      'ZIP Code',                    // L (11)
      'GPS Latitude',                // M (12)
      'GPS Longitude',               // N (13)
      'Additional Notes',            // O (14)
      'Patient/Caller Name',         // P (15)
      'Contact Information',         // Q (16)
      'Patient DOB',                 // R (17)
      'Call Closed Time',            // S (18)
      'Generated XML',               // T (19)
      'ESO Upload Status',           // U (20)
      'Response Mode',               // V (21)
      'Priority Level',              // W (22)
      'Record Created',              // X (23)
      'Last Updated',                // Y (24)
      'Number of Units',             // Z (25)
      'Unit Dispatched Times',       // AA (26)
      'Unit En Route Times',         // AB (27)
      'Unit Arrived Times',          // AC (28)
      'Unit At Patient Times',       // AD (29)
      'Unit Cleared Times',          // AE (30)
      'Unit Back In Service Times',  // AF (31)
      'Unit Transport Times',        // AG (32)
      'Unit At Hospital Times',      // AH (33)
      'Call Closed',                 // AI (34)
      'Test Call',                   // AJ (35) - Button column
      'Test Result'                  // AK (36) - Result column
    ];

    console.log(`Target headers: ${targetHeaders.length}`);

    // Update headers
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: 'Call Data!A1:AK1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [targetHeaders],
      },
    });

    console.log('Headers updated with Test Result column');

    // Create test buttons for existing call data
    if (data.length > 1) {
      console.log('Adding test buttons to existing calls...');
      
      const testButtonRows = [];
      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const callId = row[1] || ''; // Emergency Call ID
        
        if (callId) {
          // Create test button formula that opens a test URL
          const testButtonFormula = `=HYPERLINK("https://resgrid-eso-bridge.replit.app/test/${callId}", "🧪 Test Call ${callId}")`;
          testButtonRows.push([testButtonFormula, '']); // Button in AJ, empty result in AK
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

    // Apply formatting to the Test Call and Test Result columns
    console.log('Applying column formatting...');
    
    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId,
      resource: {
        requests: [
          // Format Test Call column (AJ) - center align and blue text
          {
            repeatCell: {
              range: {
                sheetId: 0,
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
                sheetId: 0,
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
                sheetId: 0,
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
                sheetId: 0,
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

    console.log('Column formatting applied');

    // Verify final structure
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });
    
    const finalHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`\nFinal verification: ${finalHeaders.length} headers`);
    
    const testCallFinalIndex = finalHeaders.findIndex(h => h === 'Test Call');
    const testResultIndex = finalHeaders.findIndex(h => h === 'Test Result');
    
    console.log(`Test Call: Column ${String.fromCharCode(65 + testCallFinalIndex)} (index ${testCallFinalIndex})`);
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
    await addTestColumns();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { addTestColumns };