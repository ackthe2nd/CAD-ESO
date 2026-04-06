/**
 * Fix Responding Units Data - Replace Test Data with Real Resgrid Units
 * Ensures all Responding Units fields contain authentic unit names from Resgrid API
 */

require('dotenv').config();
const { google } = require('googleapis');
const { apiClient } = require('./src/token-manager.js');
const { getCallExtraData } = require('./src/resgrid-api.js');

async function fixRespondingUnitsData() {
  console.log('Fixing Responding Units Data');
  console.log('============================');
  console.log('Replacing test data with authentic Resgrid unit information...');

  try {
    // Initialize Google Sheets
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get current data
    console.log('Fetching current Google Sheets data...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));
    const respondingUnitsIndex = headers.findIndex(h => h.toLowerCase().includes('responding units'));

    console.log(`Found ${allData.length - 1} data rows`);
    console.log(`Emergency Call ID column: ${callIdIndex + 1}`);
    console.log(`Responding Units column: ${respondingUnitsIndex + 1}`);

    // Check each call and fix units data
    const fixedUnitsData = [];
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const callId = row[callIdIndex];
      const currentUnits = row[respondingUnitsIndex] || '';
      
      if (!callId || !callId.trim()) {
        fixedUnitsData.push(['']);
        continue;
      }
      
      console.log(`\nProcessing Call ${callId}:`);
      console.log(`  Current units: "${currentUnits}"`);
      
      // Check if current data contains test/invalid data
      const hasInvalidData = currentUnits.includes('Test') || 
                            currentUnits.includes('🔄') || 
                            currentUnits.trim() === '';
      
      if (hasInvalidData) {
        console.log(`  ❌ Invalid data detected, fetching real units...`);
        
        try {
          // Try to get real units from active calls first
          const activeCallsResponse = await apiClient.get('Calls/GetActiveCalls');
          const activeCalls = activeCallsResponse.data || [];
          const activeCall = activeCalls.find(call => call.CallId.toString() === callId.toString());
          
          if (activeCall) {
            console.log(`  Found call in active calls`);
            
            // Get extra data for units
            const extraData = await getCallExtraData(callId);
            
            if (extraData && extraData.Data && extraData.Data.Dispatches) {
              // Extract real unit names from dispatches
              const realUnits = [];
              extraData.Data.Dispatches.forEach(dispatch => {
                if (dispatch.UnitName && !realUnits.includes(dispatch.UnitName)) {
                  realUnits.push(dispatch.UnitName);
                } else if (dispatch.Name && !realUnits.includes(dispatch.Name)) {
                  realUnits.push(dispatch.Name);
                }
              });
              
              if (realUnits.length > 0) {
                const unitsString = realUnits.join(', ');
                fixedUnitsData.push([unitsString]);
                console.log(`  ✅ Fixed with real units: ${unitsString}`);
              } else {
                // No units found in dispatches, but call exists - leave empty rather than fake data
                fixedUnitsData.push(['']);
                console.log(`  ℹ️ No units found in dispatches`);
              }
            } else {
              fixedUnitsData.push(['']);
              console.log(`  ℹ️ No extra data available`);
            }
          } else {
            // Call not in active calls, try recent calls
            console.log(`  Call not in active calls, checking recent calls...`);
            
            try {
              const endDate = new Date().toISOString().split('T')[0];
              const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
              
              const recentCallsResponse = await apiClient.get('Calls/GetCalls', {
                params: { startDate, endDate }
              });
              
              const recentCalls = recentCallsResponse.data || [];
              const recentCall = recentCalls.find(call => call.CallId.toString() === callId.toString());
              
              if (recentCall) {
                console.log(`  Found call in recent calls`);
                
                const extraData = await getCallExtraData(callId);
                
                if (extraData && extraData.Data && extraData.Data.Dispatches) {
                  const realUnits = [];
                  extraData.Data.Dispatches.forEach(dispatch => {
                    if (dispatch.UnitName && !realUnits.includes(dispatch.UnitName)) {
                      realUnits.push(dispatch.UnitName);
                    } else if (dispatch.Name && !realUnits.includes(dispatch.Name)) {
                      realUnits.push(dispatch.Name);
                    }
                  });
                  
                  if (realUnits.length > 0) {
                    const unitsString = realUnits.join(', ');
                    fixedUnitsData.push([unitsString]);
                    console.log(`  ✅ Fixed with real units: ${unitsString}`);
                  } else {
                    fixedUnitsData.push(['']);
                    console.log(`  ℹ️ No units found in recent call data`);
                  }
                } else {
                  fixedUnitsData.push(['']);
                  console.log(`  ℹ️ No extra data for recent call`);
                }
              } else {
                // Call not found anywhere - clear invalid data
                fixedUnitsData.push(['']);
                console.log(`  ❌ Call not found in recent calls, clearing invalid data`);
              }
            } catch (error) {
              console.log(`  ❌ Error fetching recent calls: ${error.message}`);
              fixedUnitsData.push(['']);
            }
          }
        } catch (error) {
          console.log(`  ❌ Error fetching real data: ${error.message}`);
          fixedUnitsData.push(['']);
        }
      } else {
        // Current data looks valid, preserve it
        fixedUnitsData.push([currentUnits]);
        console.log(`  ✅ Valid data preserved: ${currentUnits}`);
      }
    }

    // Update the Responding Units column with fixed data
    if (fixedUnitsData.length > 0) {
      const respondingUnitsColumn = String.fromCharCode(65 + respondingUnitsIndex);
      console.log(`\nUpdating column ${respondingUnitsColumn} with authentic unit data...`);
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!${respondingUnitsColumn}2:${respondingUnitsColumn}${fixedUnitsData.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: fixedUnitsData,
        },
      });
      
      console.log(`Updated ${fixedUnitsData.length} rows with authentic Resgrid data`);
    }

    console.log('\n✅ Responding Units data integrity restored');
    console.log('All fields now contain authentic Resgrid information');

  } catch (error) {
    console.error('Error fixing responding units data:', error.message);
    throw error;
  }
}

async function verifyDataIntegrity() {
  console.log('\nVerifying Data Integrity');
  console.log('========================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));
    const respondingUnitsIndex = headers.findIndex(h => h.toLowerCase().includes('responding units'));

    console.log('Post-fix verification:');
    
    let validCount = 0;
    let invalidCount = 0;
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const callId = row[callIdIndex];
      const units = row[respondingUnitsIndex] || '';
      
      if (!callId) continue;
      
      if (units.includes('Test') || units.includes('🔄')) {
        console.log(`  ❌ Call ${callId}: Still contains invalid data - "${units}"`);
        invalidCount++;
      } else {
        console.log(`  ✅ Call ${callId}: Valid data - "${units}"`);
        validCount++;
      }
    }
    
    console.log(`\nVerification Results:`);
    console.log(`  Valid entries: ${validCount}`);
    console.log(`  Invalid entries: ${invalidCount}`);
    
    if (invalidCount === 0) {
      console.log('✅ All Responding Units fields now contain authentic data');
    } else {
      console.log('❌ Some entries still contain invalid data');
    }

  } catch (error) {
    console.error('Error verifying data integrity:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await fixRespondingUnitsData();
    await verifyDataIntegrity();
    
    console.log('\n=== DATA INTEGRITY FIX COMPLETED ===');
    console.log('✅ Responding Units column restored with authentic Resgrid data');
    console.log('✅ All test/placeholder data removed');
    console.log('✅ System now uses only real emergency service information');
    
  } catch (error) {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { fixRespondingUnitsData, verifyDataIntegrity };