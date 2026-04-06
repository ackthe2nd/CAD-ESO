/**
 * Fix Corrupted Header in Column 4
 * Restores "Responding Units" header that got corrupted during column deletion
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixCorruptedHeader() {
  try {
    console.log('Fixing corrupted header in column 4...');

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

    // Fix the specific header in column 4 (D4)
    console.log('Updating column 4 header to "Responding Units"...');
    
    await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range: 'Call Data!D1',
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [['Responding Units']],
      },
    });

    // Verify the fix
    const verifyResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!1:1',
    });

    const headers = verifyResponse.data.values?.[0] || [];
    console.log(`Column 4 header is now: "${headers[3]}"`);

    if (headers[3] === 'Responding Units') {
      console.log('✅ Successfully fixed corrupted header');
      return true;
    } else {
      console.log('❌ Header fix failed');
      return false;
    }

  } catch (error) {
    console.error('Error fixing corrupted header:', error.message);
    return false;
  }
}

async function main() {
  console.log('Google Sheets Header Corruption Fix');
  console.log('===================================');
  
  const success = await fixCorruptedHeader();
  
  if (success) {
    console.log('\n✅ Header corruption fix completed successfully');
  } else {
    console.log('\n❌ Header corruption fix failed');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixCorruptedHeader };