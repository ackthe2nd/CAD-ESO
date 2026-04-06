/**
 * Add Test Button Column to Google Sheets Call Data
 * Creates a new column with hyperlink buttons to test specific calls with the system
 */

require('dotenv').config();
const { google } = require('googleapis');

async function addTestButtonColumn() {
  try {
    console.log('Adding Test Button column to Google Sheets Call Data...');

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

    // Get current headers to see where to add the new column
    console.log('Getting current headers...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const currentHeaders = response.data.values?.[0] || [];
    console.log(`Current header count: ${currentHeaders.length}`);

    // Add "Test Call" column after the existing headers
    const newHeaders = [...currentHeaders, 'Test Call'];
    const newColumnIndex = currentHeaders.length; // 0-indexed position for new column

    console.log('Adding "Test Call" header...');
    
    // Update headers to include the new column
    let headerEndColumn;
    if (newHeaders.length <= 26) {
      headerEndColumn = String.fromCharCode(65 + newHeaders.length - 1);
    } else {
      // Handle columns beyond Z (AA, AB, etc.)
      const firstLetter = String.fromCharCode(65 + Math.floor((newHeaders.length - 1) / 26) - 1);
      const secondLetter = String.fromCharCode(65 + ((newHeaders.length - 1) % 26));
      headerEndColumn = firstLetter + secondLetter;
    }
    
    console.log(`Updating header range: Call Data!A1:${headerEndColumn}1 (${newHeaders.length} columns)`);
    
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: `Call Data!A1:${headerEndColumn}1`,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [newHeaders],
      },
    });

    // Get all existing data to add test buttons for existing calls
    console.log('Getting existing call data...');
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:B', // Get Call Received Time and Emergency Call ID columns
    });

    const existingData = dataResponse.data.values || [];
    console.log(`Found ${existingData.length - 1} existing calls`);

    // Create test button formulas for existing calls
    const testButtonData = [];
    
    for (let i = 1; i < existingData.length; i++) { // Skip header row
      const row = existingData[i];
      const callId = row[1]; // Emergency Call ID is in column B (index 1)
      
      if (callId && callId.trim()) {
        // Create hyperlink formula that triggers call testing via script
        const testScript = `https://replit.com/@replit/resgrid-eso-bridge/run?args=test-call-${callId}`;
        const hyperlinkFormula = `=HYPERLINK("${testScript}", "🔄 Test ${callId}")`;
        testButtonData.push([hyperlinkFormula]);
      } else {
        testButtonData.push(['']); // Empty cell for rows without call ID
      }
    }

    if (testButtonData.length > 0) {
      console.log(`Adding test buttons for ${testButtonData.length} existing calls...`);
      
      const testColumnLetter = String.fromCharCode(65 + newColumnIndex);
      const endRow = testButtonData.length + 1;
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!${testColumnLetter}2:${testColumnLetter}${endRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: testButtonData,
        },
      });
    }

    // Format the new column to make it look like buttons
    console.log('Formatting Test Call column...');
    
    const sheetMetadata = await sheetsClient.spreadsheets.get({
      spreadsheetId,
    });

    let callDataSheetId = null;
    for (const sheet of sheetMetadata.data.sheets) {
      if (sheet.properties.title === 'Call Data') {
        callDataSheetId = sheet.properties.sheetId;
        break;
      }
    }

    if (callDataSheetId) {
      // Format the new column with blue background and white text
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            {
              repeatCell: {
                range: {
                  sheetId: callDataSheetId,
                  startColumnIndex: newColumnIndex,
                  endColumnIndex: newColumnIndex + 1,
                  startRowIndex: 1, // Skip header row
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: {
                      red: 0.2,
                      green: 0.4,
                      blue: 0.8
                    },
                    textFormat: {
                      foregroundColor: {
                        red: 1.0,
                        green: 1.0,
                        blue: 1.0
                      },
                      bold: true
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
    }

    console.log('✅ Successfully added Test Call column');
    console.log(`New column position: ${newColumnIndex + 1} (${String.fromCharCode(65 + newColumnIndex)})`);
    console.log(`Total columns now: ${newHeaders.length}`);

    return true;

  } catch (error) {
    console.error('Error adding test button column:', error.message);
    return false;
  }
}

async function main() {
  console.log('Google Sheets Test Button Column Addition');
  console.log('========================================');
  
  const success = await addTestButtonColumn();
  
  if (success) {
    console.log('\n✅ Test button column added successfully');
    console.log('Users can now click the "Test Call" buttons to test specific calls');
    console.log('The hyperlinks will include the call ID for targeted testing');
  } else {
    console.log('\n❌ Failed to add test button column');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { addTestButtonColumn };