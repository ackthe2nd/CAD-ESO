/**
 * Update Test Call Buttons with Working Hyperlinks
 * Creates clickable test buttons that trigger the test endpoint
 */

require('dotenv').config();
const { google } = require('googleapis');

async function updateTestButtonsWithLinks() {
  console.log('Updating Test Call Buttons with Working Hyperlinks');
  console.log('==================================================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get existing call data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!B2:B100', // Emergency Call ID column
    });

    const callIds = dataResponse.data.values || [];
    console.log(`Found ${callIds.length} existing calls`);

    if (callIds.length > 0) {
      const testButtonRows = [];
      const baseUrl = process.env.REPLIT_DOMAIN ? 
        `https://${process.env.REPLIT_DOMAIN}` : 
        'https://resgrid2eso.fly.dev'; // Fallback to Fly.io deployment

      for (let i = 0; i < callIds.length; i++) {
        const callId = callIds[i] && callIds[i][0] ? callIds[i][0] : '';
        if (callId && callId.trim() !== '') {
          // Create HYPERLINK formula for test button
          const testUrl = `${baseUrl}/api/test/${callId}`;
          const hyperlink = `=HYPERLINK("${testUrl}","🧪 Test ${callId}")`;
          testButtonRows.push([hyperlink]);
        } else {
          testButtonRows.push(['']); // Empty for rows without call ID
        }
      }

      if (testButtonRows.length > 0) {
        // Update Test Call column (AJ) with hyperlinks
        await sheetsClient.spreadsheets.values.update({
          spreadsheetId,
          range: `Call Data!AJ2:AJ${testButtonRows.length + 1}`,
          valueInputOption: 'USER_ENTERED',
          resource: {
            values: testButtonRows,
          },
        });
        
        console.log(`Updated test buttons with hyperlinks for ${testButtonRows.length} calls`);
        console.log(`Test URL format: ${baseUrl}/api/test/{callId}`);
      }
    }

    // Get the Call Data sheet ID for formatting
    const spreadsheetInfo = await sheetsClient.spreadsheets.get({
      spreadsheetId,
    });

    const callDataSheet = spreadsheetInfo.data.sheets.find(
      sheet => sheet.properties.title === 'Call Data'
    );

    if (callDataSheet) {
      const sheetId = callDataSheet.properties.sheetId;

      // Apply enhanced formatting to the Test Call column
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: [
            // Format Test Call column (AJ) with enhanced styling
            {
              repeatCell: {
                range: {
                  sheetId: sheetId,
                  startColumnIndex: 35, // AJ column (0-indexed)
                  endColumnIndex: 36,
                  startRowIndex: 1 // Skip header
                },
                cell: {
                  userEnteredFormat: {
                    horizontalAlignment: 'CENTER',
                    textFormat: {
                      foregroundColor: { red: 0.2, green: 0.4, blue: 0.8 },
                      bold: true,
                      underline: true
                    },
                    backgroundColor: { red: 0.95, green: 0.97, blue: 1.0 }
                  }
                },
                fields: 'userEnteredFormat(horizontalAlignment,textFormat,backgroundColor)'
              }
            }
          ]
        }
      });

      console.log('Applied enhanced formatting to Test Call buttons');
    }

    console.log('\n✅ Test buttons updated with working hyperlinks');
    console.log('✅ Buttons now trigger test endpoint when clicked');
    console.log('✅ Test results will be populated in Test Result column');

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await updateTestButtonsWithLinks();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { updateTestButtonsWithLinks };