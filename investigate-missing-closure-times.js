/**
 * Investigate Missing Call Closure Times in Google Sheets
 * Check why closed calls don't have Call Closed Time populated
 */

require('dotenv').config();
const { google } = require('googleapis');

async function getGoogleSheetsAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  return auth;
}

async function analyzeClosedCallsData() {
  console.log('ANALYZING CLOSED CALLS DATA IN GOOGLE SHEETS');
  console.log('='.repeat(50));
  
  try {
    const auth = await getGoogleSheetsAuth();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get all call data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!A1:AZ100'
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log('No data found in sheets');
      return;
    }
    
    const headers = rows[0];
    console.log('Available columns:', headers.length);
    
    // Find relevant column indices
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const lastUpdatedIndex = headers.findIndex(h => h === 'Last Updated');
    const recordCreatedIndex = headers.findIndex(h => h === 'Record Created');
    
    console.log(`\nColumn indices:`);
    console.log(`Emergency Call ID: ${callIdIndex}`);
    console.log(`Call Closed: ${callClosedIndex}`);
    console.log(`Call Closed Time: ${callClosedTimeIndex}`);
    console.log(`Last Updated: ${lastUpdatedIndex}`);
    console.log(`Record Created: ${recordCreatedIndex}`);
    
    // Analyze call closure data
    console.log('\nANALYZING CALL CLOSURE DATA:');
    console.log('-'.repeat(40));
    
    let totalCalls = 0;
    let closedCalls = 0;
    let closedWithTime = 0;
    let closedWithoutTime = 0;
    
    const dataRows = rows.slice(1); // Skip header
    
    dataRows.forEach((row, index) => {
      if (row.length > callIdIndex && row[callIdIndex]) {
        totalCalls++;
        
        const callId = row[callIdIndex];
        const callClosed = row[callClosedIndex] || '';
        const callClosedTime = row[callClosedTimeIndex] || '';
        const lastUpdated = row[lastUpdatedIndex] || '';
        const recordCreated = row[recordCreatedIndex] || '';
        
        // Check if call is marked as closed
        const isClosed = callClosed.toLowerCase() === 'yes' || 
                        callClosed.toLowerCase() === 'true' || 
                        callClosed === 'TRUE' || 
                        callClosed === true;
        
        if (isClosed) {
          closedCalls++;
          
          if (callClosedTime && callClosedTime.trim() !== '') {
            closedWithTime++;
            console.log(`✓ Call ${callId}: Closed with time (${callClosedTime})`);
          } else {
            closedWithoutTime++;
            console.log(`❌ Call ${callId}: Closed WITHOUT time (Created: ${recordCreated}, Updated: ${lastUpdated})`);
          }
        }
      }
    });
    
    console.log(`\nSUMMARY:`);
    console.log(`Total calls: ${totalCalls}`);
    console.log(`Closed calls: ${closedCalls}`);
    console.log(`Closed with time: ${closedWithTime}`);
    console.log(`Closed without time: ${closedWithoutTime}`);
    
    if (closedWithoutTime > 0) {
      console.log(`\n❌ ISSUE: ${closedWithoutTime} closed calls missing Call Closed Time`);
    }
    
  } catch (error) {
    console.error('Error analyzing sheets data:', error.message);
  }
}

async function checkCallClosureLogic() {
  console.log('\nCHECKING CALL CLOSURE LOGIC');
  console.log('='.repeat(30));
  
  console.log('Current system configuration:');
  console.log('1. SignalR CallClosed event handler: ACTIVE');
  console.log('2. CallStateChanged event monitoring: ACTIVE');
  console.log('3. Call closure detection in polling: ACTIVE');
  
  console.log('\nExpected closure workflow:');
  console.log('1. Call closed in Resgrid → SignalR event fired');
  console.log('2. System fetches updated call data');
  console.log('3. Detects State = 2 (closed)');
  console.log('4. Updates Google Sheets with:');
  console.log('   - Call Closed: "Yes"');
  console.log('   - Call Closed Time: Pacific Time timestamp');
  console.log('   - Last Updated: Current timestamp');
  
  console.log('\nPossible issues:');
  console.log('• Call closure time not extracted from Resgrid data');
  console.log('• Google Sheets update logic missing Call Closed Time');
  console.log('• Timestamp format conversion issue');
  console.log('• Column mapping incorrect');
}

function generateFixRecommendations() {
  console.log('\nFIX RECOMMENDATIONS');
  console.log('='.repeat(20));
  
  console.log('1. Check sheets-logger.js for Call Closed Time mapping');
  console.log('2. Verify timestamp extraction from Resgrid call data');
  console.log('3. Ensure Pacific Time conversion for closure timestamps');
  console.log('4. Test SignalR CallClosed event with actual call closure');
  console.log('5. Review Google Sheets column update logic');
}

async function main() {
  await analyzeClosedCallsData();
  checkCallClosureLogic();
  generateFixRecommendations();
}

main().catch(console.error);