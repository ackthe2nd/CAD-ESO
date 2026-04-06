/**
 * Verify and Populate Missing Fields
 * Checks existing calls and ensures all fields are properly populated
 */

require('dotenv').config();
const { google } = require('googleapis');
const { getApiToken } = require('./src/token-manager');
const { getCallExtraData } = require('./src/resgrid-api');
const { generateXML } = require('./src/xml-generator');
const axios = require('axios');

async function verifyAndPopulateMissingFields() {
  console.log('Verifying and Populating Missing Fields in Google Sheets');
  console.log('======================================================');

  try {
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get existing call data
    const dataResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AK',
    });

    const rows = dataResponse.data.values || [];
    const headers = rows[0] || [];
    
    console.log(`Found ${rows.length - 1} calls to verify`);
    console.log(`Headers: ${headers.length} columns`);

    // Get Resgrid API token
    const token = await getApiToken();
    console.log('✅ Resgrid API token obtained');

    let updatedCount = 0;

    // Process each call (skip header row)
    for (let i = 1; i < Math.min(rows.length, 10); i++) { // Limit to first 10 for testing
      const row = rows[i] || [];
      const callId = row[1]; // Emergency Call ID column
      
      if (!callId || callId.trim() === '') {
        continue;
      }

      console.log(`\nProcessing call ${callId}...`);

      // Check if essential fields are missing
      const respondingUnits = row[3] || ''; // Column D
      const callTitle = row[4] || '';       // Column E
      const incidentType = row[5] || '';    // Column F

      if (!respondingUnits || !callTitle || !incidentType) {
        console.log(`  Missing fields detected for call ${callId}`);
        
        try {
          // Fetch fresh call data from Resgrid
          const callData = await fetchCallData(token, callId);
          const extraData = await getCallExtraData(callId);

          if (callData && extraData) {
            // Extract missing data
            const units = extractUnits(extraData);
            const title = extractCallTitle(callData, extraData);
            const incident = extractIncidentType(callData);

            // Build update row
            const updatedRow = [...row];
            
            // Update missing fields
            if (!respondingUnits && units.length > 0) {
              updatedRow[3] = units.join(', ');
              console.log(`  ✅ Updated Responding Units: ${units.join(', ')}`);
            }
            
            if (!callTitle && title) {
              updatedRow[4] = title;
              console.log(`  ✅ Updated Call Title: ${title}`);
            }
            
            if (!incidentType && incident) {
              updatedRow[5] = incident;
              console.log(`  ✅ Updated Incident Type: ${incident}`);
            }

            // Update the row in Google Sheets
            await sheetsClient.spreadsheets.values.update({
              spreadsheetId,
              range: `Call Data!A${i + 1}:AK${i + 1}`,
              valueInputOption: 'USER_ENTERED',
              resource: {
                values: [updatedRow],
              },
            });

            updatedCount++;
            console.log(`  ✅ Updated call ${callId} in Google Sheets`);
          } else {
            console.log(`  ❌ Could not fetch data for call ${callId}`);
          }
        } catch (error) {
          console.log(`  ❌ Error processing call ${callId}: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Call ${callId} has all essential fields`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`\n✅ Verification complete. Updated ${updatedCount} calls`);

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  }
}

async function fetchCallData(token, callId) {
  try {
    // First try to get from active calls
    const activeCallsResponse = await axios({
      method: 'GET',
      url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (activeCallsResponse.data?.Data) {
      const call = activeCallsResponse.data.Data.find(c => c.CallId.toString() === callId.toString());
      if (call) {
        return call;
      }
    }
    
    // If not found in active calls, try individual call fetch
    const callResponse = await axios({
      method: 'GET',
      url: `https://api.resgrid.com/api/v4/Calls/GetCall`,
      params: { callId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    return callResponse.data?.Data || null;
  } catch (error) {
    console.error(`Error fetching call data for ${callId}: ${error.message}`);
    return null;
  }
}

function extractUnits(extraData) {
  const units = [];
  
  if (extraData?.Data?.Dispatches) {
    extraData.Data.Dispatches.forEach(dispatch => {
      if (dispatch.Name && !units.includes(dispatch.Name)) {
        units.push(dispatch.Name);
      }
    });
  }
  
  return units;
}

function extractCallTitle(callData, extraData) {
  return callData?.Name || extraData?.Data?.Name || 'Incident';
}

function extractIncidentType(callData) {
  const nature = callData?.Nature || '';
  
  if (nature.includes('MEDICAL EMERGENCY')) return 'MEDICAL EMERGENCY';
  if (nature.includes('EMS ASSIST')) return 'EMS ASSIST';
  if (nature.includes('GENERAL MEDICAL')) return 'GENERAL MEDICAL';
  if (nature.includes('Non-Emergency')) return 'Non-Emergency';
  
  return nature || 'General Medical';
}

async function main() {
  try {
    await verifyAndPopulateMissingFields();
  } catch (error) {
    console.error('Failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verifyAndPopulateMissingFields };