/**
 * Verify ALL Timestamp Formats in Google Sheets
 * Ensure every timestamp field uses the exact "2025-06-12 18:02:58" format
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyAllTimestampFormats() {
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get recent call data from sheets
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!A1:AK10'
    });
    
    const data = dataResponse.data.values || [];
    const headers = data[0] || [];
    
    // Find all timestamp-related columns
    const timestampColumns = [
      'Call Received Time',
      'Call Closed Time', 
      'Record Created',
      'Last Updated',
      'Unit Dispatched Times',
      'Unit En Route Times',
      'Unit Arrived Times',
      'Unit At Patient Times',
      'Unit Cleared Times',
      'Unit Back In Service Times',
      'Unit Transport Times',
      'Unit At Hospital Times'
    ];
    
    const columnIndexes = {};
    timestampColumns.forEach(col => {
      const index = headers.findIndex(h => h === col);
      if (index !== -1) {
        columnIndexes[col] = index;
      }
    });
    
    console.log('ALL TIMESTAMP FORMATS VERIFICATION');
    console.log('='.repeat(50));
    console.log('Required format: YYYY-MM-DD HH:MM:SS (e.g., "2025-06-12 18:02:58")');
    console.log('='.repeat(50));
    
    // Check the most recent calls
    const recentCalls = data.slice(1, 4); // Skip header, get first 3 data rows
    const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID');
    
    const correctFormatRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
    let totalChecks = 0;
    let correctFormats = 0;
    let incorrectFormats = 0;
    
    for (let i = 0; i < recentCalls.length; i++) {
      const row = recentCalls[i];
      const callId = row[callIdIndex] || `Row ${i + 2}`;
      
      console.log(`\n📋 Call ${callId}:`);
      console.log('-'.repeat(30));
      
      for (const [columnName, columnIndex] of Object.entries(columnIndexes)) {
        const value = row[columnIndex] || '';
        totalChecks++;
        
        if (!value || value.trim() === '') {
          console.log(`  ${columnName}: (empty)`);
          continue;
        }
        
        // For comma-separated timestamp fields (Unit timing fields)
        if (value.includes(',')) {
          const timestamps = value.split(',').map(t => t.trim()).filter(t => t !== '');
          let allCorrect = true;
          
          for (const timestamp of timestamps) {
            if (!correctFormatRegex.test(timestamp)) {
              allCorrect = false;
              break;
            }
          }
          
          if (allCorrect && timestamps.length > 0) {
            console.log(`  ${columnName}: ✅ ${timestamps.join(', ')}`);
            correctFormats++;
          } else {
            console.log(`  ${columnName}: ❌ ${value}`);
            incorrectFormats++;
          }
        } else {
          // Single timestamp field
          if (correctFormatRegex.test(value)) {
            console.log(`  ${columnName}: ✅ ${value}`);
            correctFormats++;
          } else {
            console.log(`  ${columnName}: ❌ ${value}`);
            incorrectFormats++;
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total timestamp checks: ${totalChecks}`);
    console.log(`Correct format: ${correctFormats}`);
    console.log(`Incorrect format: ${incorrectFormats}`);
    
    if (incorrectFormats === 0) {
      console.log('🎉 ALL TIMESTAMP FORMATS ARE CORRECT!');
      console.log('All fields use the required "2025-06-12 18:02:58" format.');
    } else {
      console.log(`⚠️  ${incorrectFormats} timestamp fields still need fixing.`);
      console.log('Fields must use "YYYY-MM-DD HH:MM:SS" format exactly.');
    }
    
    console.log('\nFormat Examples:');
    console.log('✅ Correct: "2025-06-12 18:02:58"');
    console.log('❌ Wrong: "6/12/2025 6:02:58"');
    console.log('❌ Wrong: "2025-06-12T18:02:58.123Z"');
    console.log('❌ Wrong: "6/13/2025 0:37:38"');
    
  } catch (error) {
    console.error('Error verifying timestamp formats:', error.message);
  }
}

verifyAllTimestampFormats();