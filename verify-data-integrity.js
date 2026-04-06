/**
 * Verify Data Integrity - Check All Fields Have Real Resgrid Data
 * Analyzes Google Sheets data to ensure all fields contain authentic information
 */

require('dotenv').config();
const { google } = require('googleapis');
const { apiClient } = require('./src/token-manager.js');
const { getCallExtraData } = require('./src/resgrid-api.js');

async function verifyDataIntegrity() {
  console.log('Data Integrity Verification');
  console.log('===========================');

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

    // Get all current data from Google Sheets
    console.log('Fetching current Google Sheets data...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    console.log(`Found ${allData.length - 1} data rows with ${headers.length} columns`);

    // Find key column indices
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));
    const respondingUnitsIndex = headers.findIndex(h => h.toLowerCase().includes('responding units'));
    const callTitleIndex = headers.findIndex(h => h.toLowerCase().includes('call title'));
    const incidentTypeIndex = headers.findIndex(h => h.toLowerCase().includes('incident type'));
    const addressIndex = headers.findIndex(h => h.toLowerCase().includes('emergency address'));

    console.log('\nColumn Analysis:');
    console.log(`Emergency Call ID: Column ${callIdIndex + 1} (${String.fromCharCode(65 + callIdIndex)})`);
    console.log(`Responding Units: Column ${respondingUnitsIndex + 1} (${String.fromCharCode(65 + respondingUnitsIndex)})`);
    console.log(`Call Title: Column ${callTitleIndex + 1} (${String.fromCharCode(65 + callTitleIndex)})`);
    console.log(`Incident Type: Column ${incidentTypeIndex + 1} (${String.fromCharCode(65 + incidentTypeIndex)})`);
    console.log(`Emergency Address: Column ${addressIndex + 1} (${String.fromCharCode(65 + addressIndex)})`);

    // Check each call's data integrity
    console.log('\nChecking Data Integrity for Each Call:');
    console.log('=====================================');

    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const callId = row[callIdIndex];
      
      if (!callId || !callId.trim()) continue;
      
      console.log(`\nCall ${callId}:`);
      
      // Check Responding Units field
      const respondingUnits = row[respondingUnitsIndex] || '';
      console.log(`  Responding Units: "${respondingUnits}"`);
      
      if (!respondingUnits || respondingUnits.trim() === '') {
        console.log(`  ❌ ISSUE: Empty responding units field`);
      } else if (respondingUnits.includes('Test') || respondingUnits.includes('🔄')) {
        console.log(`  ❌ ISSUE: Contains test/button data instead of real units`);
      } else {
        console.log(`  ✅ Has responding units data`);
      }
      
      // Check other key fields
      const callTitle = row[callTitleIndex] || '';
      const incidentType = row[incidentTypeIndex] || '';
      const address = row[addressIndex] || '';
      
      console.log(`  Call Title: "${callTitle}"`);
      console.log(`  Incident Type: "${incidentType}"`);
      console.log(`  Address: "${address}"`);
      
      // Fetch real data from Resgrid to compare
      try {
        console.log(`  Fetching real data from Resgrid...`);
        
        // Get call from active calls
        const activeCallsResponse = await apiClient.get('Calls/GetActiveCalls');
        const activeCalls = activeCallsResponse.data || [];
        const realCallData = activeCalls.find(call => call.CallId.toString() === callId.toString());
        
        if (realCallData) {
          console.log(`  Real Resgrid Data:`);
          console.log(`    Title: "${realCallData.Name || 'N/A'}"`);
          console.log(`    Nature: "${realCallData.Nature || 'N/A'}"`);
          console.log(`    Address: "${realCallData.Address || 'N/A'}"`);
          
          // Get extra data for units
          const extraData = await getCallExtraData(callId);
          if (extraData && extraData.Data && extraData.Data.Dispatches) {
            const realUnits = extraData.Data.Dispatches.map(d => d.UnitName || d.Name).filter(u => u);
            console.log(`    Real Units: [${realUnits.join(', ')}]`);
            
            // Compare with sheet data
            if (respondingUnits !== realUnits.join(', ')) {
              console.log(`  ❌ MISMATCH: Sheet units don't match Resgrid units`);
              console.log(`    Sheet: "${respondingUnits}"`);
              console.log(`    Resgrid: "${realUnits.join(', ')}"`);
            } else {
              console.log(`  ✅ Units match Resgrid data`);
            }
          }
          
        } else {
          console.log(`  ℹ️ Call not found in active calls (may be closed)`);
        }
        
      } catch (error) {
        console.log(`  ❌ Error fetching real data: ${error.message}`);
      }
    }

    console.log('\n=== SUMMARY ===');
    console.log('Checked all calls for data integrity');
    console.log('Identified any mismatches between sheet and Resgrid data');
    
  } catch (error) {
    console.error('Error verifying data integrity:', error.message);
    throw error;
  }
}

async function fixRespondingUnitsData() {
  console.log('\nFixing Responding Units Data');
  console.log('============================');

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
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));
    const respondingUnitsIndex = headers.findIndex(h => h.toLowerCase().includes('responding units'));

    if (callIdIndex === -1 || respondingUnitsIndex === -1) {
      throw new Error('Required columns not found');
    }

    // Fix responding units data
    const fixedData = [];
    
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const callId = row[callIdIndex];
      
      if (!callId || !callId.trim()) {
        fixedData.push(['']);
        continue;
      }
      
      try {
        console.log(`Fixing units for call ${callId}...`);
        
        // Get real units from active calls
        const activeCallsResponse = await apiClient.get('Calls/GetActiveCalls');
        const activeCalls = activeCallsResponse.data || [];
        const realCallData = activeCalls.find(call => call.CallId.toString() === callId.toString());
        
        if (realCallData) {
          const extraData = await getCallExtraData(callId);
          
          if (extraData && extraData.Data && extraData.Data.Dispatches) {
            const realUnits = extraData.Data.Dispatches.map(d => d.UnitName || d.Name).filter(u => u);
            const unitsString = realUnits.join(', ');
            fixedData.push([unitsString]);
            console.log(`  Fixed: ${unitsString}`);
          } else {
            fixedData.push(['']);
            console.log(`  No units found`);
          }
        } else {
          // Try to preserve existing good data if call not active
          const currentUnits = row[respondingUnitsIndex] || '';
          if (currentUnits && !currentUnits.includes('Test') && !currentUnits.includes('🔄')) {
            fixedData.push([currentUnits]);
            console.log(`  Preserved: ${currentUnits}`);
          } else {
            fixedData.push(['']);
            console.log(`  Cleared invalid data`);
          }
        }
        
      } catch (error) {
        console.log(`  Error fixing call ${callId}: ${error.message}`);
        fixedData.push(['']);
      }
    }

    // Update the Responding Units column
    if (fixedData.length > 0) {
      const respondingUnitsColumn = String.fromCharCode(65 + respondingUnitsIndex);
      console.log(`\nUpdating column ${respondingUnitsColumn} with fixed data...`);
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!${respondingUnitsColumn}2:${respondingUnitsColumn}${fixedData.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: fixedData,
        },
      });
      
      console.log(`Updated ${fixedData.length} rows with real unit data`);
    }

  } catch (error) {
    console.error('Error fixing responding units data:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await verifyDataIntegrity();
    await fixRespondingUnitsData();
    
    console.log('\n✅ Data integrity verification and fixes completed');
    
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyDataIntegrity, fixRespondingUnitsData };