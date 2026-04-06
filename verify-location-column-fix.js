/**
 * Verify Location Column Fix
 * Check that the Location column now shows only location descriptions, not full addresses
 */

require('dotenv').config();
const { google } = require('googleapis');

async function verifyLocationColumnFix() {
  console.log('🔍 Verifying Location Column Fix\n');
  
  try {
    // Initialize Google Sheets
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const authClient = await auth.getClient();
    const sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get current data from Google Sheets
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A1:AM20'
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    
    const locationColumnIndex = headers.indexOf('Location');
    const incidentDetailsIndex = headers.indexOf('Incident Details');
    const callIdIndex = headers.indexOf('Emergency Call ID');
    
    console.log('='.repeat(80));
    console.log('LOCATION COLUMN VERIFICATION RESULTS');
    console.log('='.repeat(80));
    console.log(`Location Column: Index ${locationColumnIndex} (Column ${String.fromCharCode(65 + locationColumnIndex)})`);
    
    // Check the specific calls we just tested
    const testCalls = ['201105', '201192', '201108'];
    const expectedLocations = {
      '201105': 'Parking lot',
      '201192': 'In street', 
      '201108': 'TEST'
    };
    
    let fixedCalls = 0;
    let totalCalls = 0;
    
    console.log('\n' + '-'.repeat(80));
    console.log('VERIFICATION OF TEST CALLS:');
    console.log('-'.repeat(80));
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row && row.length > callIdIndex) {
        const callId = row[callIdIndex] || '';
        
        if (testCalls.includes(callId)) {
          totalCalls++;
          const currentLocation = row[locationColumnIndex] || '';
          const expectedLocation = expectedLocations[callId];
          
          console.log(`\nCall ID: ${callId}`);
          console.log(`  Expected: "${expectedLocation}"`);
          console.log(`  Current:  "${currentLocation}"`);
          
          if (currentLocation === expectedLocation) {
            console.log(`  Status:   ✅ FIXED - Location shows only description`);
            fixedCalls++;
          } else if (currentLocation.includes(expectedLocation) && currentLocation.includes('-')) {
            console.log(`  Status:   ❌ STILL CONTAINS ADDRESS - needs update`);
          } else if (currentLocation === '') {
            console.log(`  Status:   ⚠️  EMPTY - may need reprocessing`);
          } else {
            console.log(`  Status:   ❓ UNEXPECTED VALUE`);
          }
        }
      }
    }
    
    console.log('\n' + '-'.repeat(80));
    console.log('OVERALL LOCATION COLUMN STATUS:');
    console.log('-'.repeat(80));
    
    let callsWithLocation = 0;
    let callsWithCorrectLocation = 0;
    
    for (let i = 1; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (row && row.length > locationColumnIndex) {
        const callId = row[callIdIndex] || '';
        const location = row[locationColumnIndex] || '';
        const incidentDetails = row[incidentDetailsIndex] || '';
        
        if (location && location.trim() !== '') {
          callsWithLocation++;
          
          // Check if location looks correct (doesn't contain address components)
          if (!location.includes(' - ') && !location.match(/\d{4,}/)) {
            callsWithCorrectLocation++;
            console.log(`Call ${callId}: "${location}" ✅`);
          } else {
            console.log(`Call ${callId}: "${location}" ❌ (contains address)`);
          }
        }
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('LOCATION COLUMN FIX SUMMARY');
    console.log('='.repeat(80));
    console.log(`Test calls verified: ${fixedCalls}/${totalCalls}`);
    console.log(`Total calls with Location data: ${callsWithLocation}`);
    console.log(`Calls with correct Location format: ${callsWithCorrectLocation}`);
    
    if (fixedCalls === totalCalls && totalCalls > 0) {
      console.log('\n🎉 SUCCESS: Location column fix is working!');
      console.log('   - Location column now shows only descriptions');
      console.log('   - No longer includes full addresses');
      console.log('   - Extraction regex is working correctly');
    } else if (callsWithCorrectLocation > 0) {
      console.log('\n✅ PROGRESS: Some calls show correct location format');
      console.log('   - May need to reprocess remaining calls');
    } else {
      console.log('\n⚠️  ISSUE: Location extraction may need further adjustment');
    }
    
  } catch (error) {
    console.error(`❌ Verification failed: ${error.message}`);
  }
}

verifyLocationColumnFix();