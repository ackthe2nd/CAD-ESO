/**
 * Remove Extra Column 36 from Google Sheets
 * Directly deletes the duplicate column that persists
 */

require('dotenv').config();
const { google } = require('googleapis');

async function removeExtraColumn() {
  try {
    console.log('Removing extra column 36 from Google Sheets...');

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

    // Get the sheet ID for "Call Data"
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

    if (!callDataSheetId) {
      throw new Error('Call Data sheet not found');
    }

    console.log(`Found Call Data sheet with ID: ${callDataSheetId}`);

    // Get current data to check column count
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const currentHeaders = dataResponse.data.values?.[0] || [];
    console.log(`Current column count: ${currentHeaders.length}`);

    if (currentHeaders.length <= 35) {
      console.log('No extra columns to remove');
      return true;
    }

    // Clear the content in column 36 and beyond
    const startColumn = 35; // Column AI (36th column, 0-indexed as 35)
    const endColumn = currentHeaders.length - 1;

    console.log(`Clearing columns ${startColumn + 1} to ${endColumn + 1}...`);

    // Clear the range
    await sheetsClient.spreadsheets.values.clear({
      spreadsheetId,
      range: `Call Data!${String.fromCharCode(65 + startColumn)}:${String.fromCharCode(65 + endColumn)}`,
    });

    // Use batchUpdate to delete the columns entirely
    const requests = [];
    
    if (currentHeaders.length > 35) {
      requests.push({
        deleteDimension: {
          range: {
            sheetId: callDataSheetId,
            dimension: 'COLUMNS',
            startIndex: 35, // Delete from column 36 (0-indexed as 35)
            endIndex: currentHeaders.length // Delete to the end
          }
        }
      });
    }

    if (requests.length > 0) {
      console.log(`Deleting ${currentHeaders.length - 35} extra columns...`);
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: {
          requests: requests
        }
      });
    }

    // Verify the fix
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const finalHeaders = verifyResponse.data.values?.[0] || [];
    console.log(`Final column count: ${finalHeaders.length}`);

    if (finalHeaders.length === 35) {
      console.log('✅ Successfully removed extra columns');
      return true;
    } else {
      console.log(`❌ Still have ${finalHeaders.length} columns, expected 35`);
      return false;
    }

  } catch (error) {
    console.error('Error removing extra column:', error.message);
    return false;
  }
}

async function main() {
  console.log('Google Sheets Extra Column Removal');
  console.log('===================================');
  
  const success = await removeExtraColumn();
  
  if (success) {
    console.log('\n✅ Extra column removal completed successfully');
  } else {
    console.log('\n❌ Extra column removal failed');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { removeExtraColumn };