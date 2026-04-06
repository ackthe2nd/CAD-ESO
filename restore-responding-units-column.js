/**
 * Restore Responding Units Column
 * Clean up the Responding Units column and ensure Test Call is properly separated
 */

require('dotenv').config();
const { google } = require('googleapis');
const { getApiToken } = require('./src/token-manager.js');
const { getCallExtraData } = require('./src/resgrid-api.js');

async function restoreRespondingUnitsColumn() {
  console.log('Restoring Responding Units Column');
  console.log('=================================');

  try {
    // Initialize Google Sheets
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
    }

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    if (!spreadsheetId) {
      throw new Error('LOG_SHEET_ID environment variable not set');
    }

    // Get current data
    console.log('Getting current Call Data...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ', // Get all current data
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    console.log(`Found ${allData.length - 1} data rows`);
    console.log('Current headers:', headers);

    // Find key column indices
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));
    const respondingUnitsIndex = headers.findIndex(h => h.toLowerCase().includes('responding units'));
    const testCallIndex = headers.findIndex(h => h.toLowerCase().includes('test call'));

    console.log(`Emergency Call ID column: ${callIdIndex}`);
    console.log(`Responding Units column: ${respondingUnitsIndex}`);
    console.log(`Test Call column: ${testCallIndex}`);

    if (callIdIndex === -1 || respondingUnitsIndex === -1) {
      throw new Error('Required columns not found');
    }

    // Get Resgrid token for fetching unit data
    console.log('Getting Resgrid API token...');
    const token = await getApiToken();

    // Process each call to restore proper unit data
    const restoredData = [];
    const testCallData = [];

    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const callId = row[callIdIndex];
      
      if (callId && callId.trim()) {
        console.log(`Processing call ${callId}...`);
        
        try {
          // Fetch extra data to get proper unit information
          const extraData = await getCallExtraData(token, callId);
          
          let unitNames = '';
          if (extraData && extraData.Data && extraData.Data.Dispatches) {
            const units = extraData.Data.Dispatches.map(dispatch => 
              dispatch.UnitName || dispatch.Name || 'Unknown'
            );
            unitNames = units.join(', ');
          }
          
          restoredData.push([unitNames]);
          
          // Create test button for Test Call column
          if (testCallIndex !== -1) {
            const testButton = `=HYPERLINK("javascript:void(0)", "🔄 Test ${callId}")`;
            testCallData.push([testButton]);
          }
          
        } catch (error) {
          console.log(`Warning: Could not fetch data for call ${callId}: ${error.message}`);
          restoredData.push(['']); // Empty if can't fetch
          if (testCallIndex !== -1) {
            testCallData.push(['']);
          }
        }
      } else {
        restoredData.push(['']);
        if (testCallIndex !== -1) {
          testCallData.push(['']);
        }
      }
    }

    // Update Responding Units column
    if (restoredData.length > 0) {
      const respondingUnitsColumn = String.fromCharCode(65 + respondingUnitsIndex);
      console.log(`Updating Responding Units column ${respondingUnitsColumn}...`);
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!${respondingUnitsColumn}2:${respondingUnitsColumn}${restoredData.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: restoredData,
        },
      });
      
      console.log(`Updated ${restoredData.length} rows in Responding Units column`);
    }

    // Update Test Call column if it exists
    if (testCallIndex !== -1 && testCallData.length > 0) {
      const testCallColumn = String.fromCharCode(65 + testCallIndex);
      console.log(`Updating Test Call column ${testCallColumn}...`);
      
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: `Call Data!${testCallColumn}2:${testCallColumn}${testCallData.length + 1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
          values: testCallData,
        },
      });
      
      console.log(`Updated ${testCallData.length} rows in Test Call column`);
    }

    console.log('✅ Successfully restored Responding Units column');
    console.log('✅ Test Call column properly separated');

  } catch (error) {
    console.error('❌ Error restoring columns:', error.message);
    throw error;
  }
}

async function main() {
  try {
    await restoreRespondingUnitsColumn();
    console.log('\n✅ Column restoration completed successfully');
  } catch (error) {
    console.error('\n❌ Restoration failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { restoreRespondingUnitsColumn };