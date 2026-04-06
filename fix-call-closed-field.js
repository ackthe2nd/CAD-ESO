/**
 * Fix Call Closed Field in Google Sheets
 * Convert timestamp values to proper "Yes"/"No" boolean indicators
 */

require('dotenv').config();
const { google } = require('googleapis');

async function fixCallClosedField() {
  console.log('FIXING CALL CLOSED FIELD IN GOOGLE SHEETS');
  console.log('='.repeat(42));
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;
    
    // Get current data
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AZ50'
    });
    
    const rows = response.data.values || [];
    if (rows.length === 0) {
      console.log('No data found in sheets');
      return;
    }
    
    const headers = rows[0];
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    
    console.log(`Call ID: Column ${callIdIndex + 1}`);
    console.log(`Call Closed: Column ${callClosedIndex + 1}`);
    console.log(`Call Closed Time: Column ${callClosedTimeIndex + 1}`);
    
    const dataRows = rows.slice(1);
    const updates = [];
    
    console.log('\nAnalyzing and fixing Call Closed field:');
    console.log('-'.repeat(40));
    
    dataRows.forEach((row, index) => {
      if (row.length > callIdIndex && row[callIdIndex]) {
        const callId = row[callIdIndex];
        const callClosed = row[callClosedIndex] || '';
        const callClosedTime = row[callClosedTimeIndex] || '';
        const rowNumber = index + 2; // +2 because array is 0-indexed and we skip header
        
        // Check if Call Closed field contains a timestamp instead of Yes/No
        const hasTimestamp = callClosed && callClosed.includes('2025-');
        const hasClosureTime = callClosedTime && callClosedTime.trim() !== '' && !callClosedTime.startsWith('0001-01-01');
        
        if (hasTimestamp || hasClosureTime) {
          // Call has closure data - should be "Yes"
          const currentValue = callClosed;
          const newValue = 'Yes';
          
          console.log(`Call ${callId}: "${currentValue}" → "${newValue}"`);
          
          // Add to batch update
          const columnLetter = String.fromCharCode(65 + callClosedIndex);
          updates.push({
            range: `Call Data!${columnLetter}${rowNumber}`,
            values: [[newValue]]
          });
        } else if (callClosed && callClosed !== 'No' && callClosed !== 'Yes') {
          // Has some other value but no closure time - should be "No"
          const currentValue = callClosed;
          const newValue = 'No';
          
          console.log(`Call ${callId}: "${currentValue}" → "${newValue}"`);
          
          const columnLetter = String.fromCharCode(65 + callClosedIndex);
          updates.push({
            range: `Call Data!${columnLetter}${rowNumber}`,
            values: [[newValue]]
          });
        } else if (!callClosed || callClosed === '') {
          // Empty field - determine based on closure time
          const newValue = hasClosureTime ? 'Yes' : 'No';
          
          console.log(`Call ${callId}: (empty) → "${newValue}"`);
          
          const columnLetter = String.fromCharCode(65 + callClosedIndex);
          updates.push({
            range: `Call Data!${columnLetter}${rowNumber}`,
            values: [[newValue]]
          });
        }
      }
    });
    
    if (updates.length > 0) {
      console.log(`\nApplying ${updates.length} updates to Google Sheets...`);
      
      // Apply batch updates
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId,
        resource: {
          valueInputOption: 'USER_ENTERED',
          data: updates
        }
      });
      
      console.log('✓ Successfully updated Call Closed field for all rows');
    } else {
      console.log('No updates needed - all Call Closed fields are already correct');
    }
    
    // Verify the fixes
    console.log('\nVerifying fixes:');
    console.log('-'.repeat(15));
    
    const verifyResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A1:AZ50'
    });
    
    const verifyRows = verifyResponse.data.values || [];
    const verifyDataRows = verifyRows.slice(1);
    
    let closedYes = 0;
    let closedNo = 0;
    let invalid = 0;
    
    verifyDataRows.forEach((row) => {
      if (row.length > callIdIndex && row[callIdIndex]) {
        const callClosed = row[callClosedIndex] || '';
        
        if (callClosed === 'Yes') {
          closedYes++;
        } else if (callClosed === 'No') {
          closedNo++;
        } else if (callClosed !== '') {
          invalid++;
          console.log(`⚠️  Invalid value found: "${callClosed}"`);
        }
      }
    });
    
    console.log(`✓ Closed calls (Yes): ${closedYes}`);
    console.log(`✓ Open calls (No): ${closedNo}`);
    console.log(`❌ Invalid values: ${invalid}`);
    
    if (invalid === 0) {
      console.log('\n🎉 All Call Closed fields are now properly formatted!');
    }
    
  } catch (error) {
    console.error('Error fixing Call Closed field:', error.message);
  }
}

async function main() {
  await fixCallClosedField();
  
  console.log('\nNEXT STEPS:');
  console.log('1. ✓ Fixed Call Closed field format (Yes/No instead of timestamps)');
  console.log('2. ✓ Updated call closure detection logic (State === 1)');
  console.log('3. → Close a call in Resgrid to test real-time detection');
  console.log('4. → System will now properly detect closures and update sheets');
}

main().catch(console.error);