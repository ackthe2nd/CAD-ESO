/**
 * Verify Call 201578 Closure was processed correctly
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyCall201578Closure() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get call data from sheets
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!A1:AK100'
    });
    
    const data = dataResponse.data.values || [];
    const headers = data[0] || [];
    
    // Find relevant columns
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const xmlStatusIndex = headers.findIndex(h => h === 'XML Upload Status');
    
    // Find call 201578 row
    let call201578Row = null;
    let rowNumber = -1;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === '201578') { // Call ID is in column B (index 1)
        call201578Row = data[i];
        rowNumber = i + 1;
        break;
      }
    }
    
    if (call201578Row) {
      console.log('CALL 201578 CLOSURE VERIFICATION');
      console.log('='.repeat(33));
      console.log(`Found in Google Sheets row: ${rowNumber}`);
      console.log(`Call Closed Time: "${call201578Row[callClosedTimeIndex] || 'Empty'}"`);
      console.log(`Call Closed: "${call201578Row[callClosedIndex] || 'Empty'}"`);
      console.log(`XML Upload Status: "${call201578Row[xmlStatusIndex] || 'Empty'}"`);
      
      const hasClosureTime = call201578Row[callClosedTimeIndex] && call201578Row[callClosedTimeIndex].trim() !== '';
      const hasClosureFlag = call201578Row[callClosedIndex] && call201578Row[callClosedIndex].trim() !== '';
      
      if (hasClosureTime && hasClosureFlag) {
        console.log('\n✅ SUCCESS: Call 201578 closure was properly detected and processed');
        console.log('The enhanced closure detection system is working correctly');
      } else {
        console.log('\n❌ ISSUE: Call 201578 closure data is incomplete');
      }
    } else {
      console.log('❌ Call 201578 not found in Google Sheets');
    }
    
  } catch (error) {
    console.error('Error verifying closure:', error.message);
  }
}

verifyCall201578Closure();