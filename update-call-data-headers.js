/**
 * Update Call Data Headers with User-Friendly Titles
 * Make headers more descriptive and easier to understand
 */

require('dotenv').config();
const { google } = require('googleapis');

async function getGoogleAuth() {
  let serviceAccount;
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decodedJson);
  } else {
    throw new Error('No Google service account credentials found');
  }

  return new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function updateCallDataHeaders() {
  const auth = await getGoogleAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Updating Call Data sheet headers with user-friendly titles...');
  
  // Enhanced, descriptive headers
  const headers = [
    'Record Created',               // A - When logged to sheets
    'Emergency Call ID',            // B - Resgrid CallId
    'Call Title',                   // C - Resgrid Name
    'Incident Type',                // D - Resgrid Type
    'Call Details',                 // E - Resgrid Nature
    'Additional Notes',             // F - Resgrid Note
    'Emergency Address',            // G - Full address
    'City',                         // H - Parsed city
    'State',                        // I - Parsed state
    'ZIP Code',                     // J - Parsed zip
    'GPS Latitude',                 // K - GPS latitude
    'GPS Longitude',                // L - GPS longitude
    'Responding Units',             // M - Unit names
    'Number of Units',              // N - Unit count
    'Priority Level',               // O - Priority ID
    'Priority Description',         // P - Priority name
    'Response Mode',                // Q - Hot/Cold response
    'Patient/Caller Name',          // R - Contact name
    'Contact Information',          // S - Phone/details
    'External Reference',           // T - External ID
    'Call Received Time',           // U - Original timestamp
    'Call Closed Time',             // V - Completion time
    'Department ID',                // W - Resgrid department
    'Call Origin',                  // X - How created
    'Deleted Status',               // Y - Is deleted
    'Current Status',               // Z - Call state
    'First Unit En Route',          // AA - En route timestamp
    'First Unit On Scene',          // AB - On scene timestamp
    'First Unit At Patient',        // AC - At patient timestamp
    'Last Unit Cleared',            // AD - Cleared timestamp
    'Last Unit Available',          // AE - Back in service
    'Generated XML',                // AF - XML content
    'XML File Size (bytes)',        // AG - XML size
    'ESO Upload Status',            // AH - SFTP status
    'ESO File Location',            // AI - SFTP URL
    'Last Updated'                  // AJ - Record update time
  ];
  
  // Update the headers
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!1:1',
    valueInputOption: 'RAW',
    resource: {
      values: [headers]
    }
  });
  
  console.log('Headers updated with descriptive titles');
  
  // Apply formatting to make headers more visible
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    resource: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0, // Assumes Call Data is the first sheet
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: headers.length
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: {
                  red: 0.2,
                  green: 0.4,
                  blue: 0.6
                },
                textFormat: {
                  foregroundColor: {
                    red: 1.0,
                    green: 1.0,
                    blue: 1.0
                  },
                  bold: true
                }
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat)'
          }
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId: 0,
              dimension: 'ROWS',
              startIndex: 0,
              endIndex: 1
            },
            properties: {
              pixelSize: 30
            },
            fields: 'pixelSize'
          }
        }
      ]
    }
  });
  
  console.log('Applied header formatting (blue background, white text, bold)');
  
  return headers;
}

async function main() {
  console.log('Updating Call Data Sheet Headers');
  console.log('================================\n');
  
  try {
    const headers = await updateCallDataHeaders();
    
    console.log('\nHeader update complete!');
    console.log(`Total columns: ${headers.length}`);
    console.log('\nKey improvements:');
    console.log('• "Call ID" → "Emergency Call ID"');
    console.log('• "Call Name" → "Call Title"');
    console.log('• "Call Type" → "Incident Type"');
    console.log('• "Nature" → "Call Details"');
    console.log('• "Address" → "Emergency Address"');
    console.log('• "Contact Name" → "Patient/Caller Name"');
    console.log('• "XML Generated" → "Generated XML"');
    console.log('• "SFTP Status" → "ESO Upload Status"');
    console.log('• Applied professional formatting');
    
  } catch (error) {
    console.error('Header update failed:', error.message);
  }
}

main();