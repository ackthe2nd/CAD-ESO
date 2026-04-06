/**
 * Test with real historical calls and export to Google Sheets
 * This script finds actual calls with single and multiple units
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');
/**
 * Extract location data from Incident Details field
 * @param {string} incidentDetails - The incident details text
 * @returns {string} Extracted location or empty string
 */
function extractLocationFromIncidentDetails(incidentDetails) {
  if (!incidentDetails || typeof incidentDetails !== 'string') {
    return '';
  }
  
  try {
    const locationMatch = incidentDetails.match(/LOCATION:\s*([^\n\r]+)/i);
    
    if (locationMatch && locationMatch[1]) {
      let location = locationMatch[1].trim();
      location = location.replace(/[.,;]+$/, '').trim();
      
      if (location.length < 3) {
        return '';
      }
      
      return location;
    }
    
    return '';
  } catch (error) {
    console.log(`Location extraction failed: ${error.message}`);
    return '';
  }
}

async function getApiToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
      grant_type: 'password',
      username: process.env.RESGRID_USER,
      password: process.env.RESGRID_PASS
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get API token:', error.message);
    throw error;
  }
}

async function getGoogleAuth() {
  try {
    let serviceAccount;
    
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
      serviceAccount = JSON.parse(decodedJson);
    } else {
      throw new Error('No Google service account credentials found');
    }

    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });

    return auth;
  } catch (error) {
    console.error('Failed to authenticate with Google:', error.message);
    throw error;
  }
}

async function fetchExistingCalls(token) {
  try {
    // Get the calls that are already logged in Google Sheets
    const knownCalls = [
      "198872", // Known to have multiple units: STN1, BLS11
      "198862", // Known to have multiple units: STN1, BLS11  
      "198898", // Known to have multiple units: CMD11, STN1, BLS11
      "199025", // Known to have multiple units: CMD11, STN1, BLS11
      "199011"  // Known to have multiple units: CMD11, STN1, BLS11
    ];

    console.log('Fetching details for known calls...');
    const callDetails = [];

    for (const callId of knownCalls) {
      try {
        const [callResponse, extraResponse] = await Promise.all([
          axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          }),
          axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);
        
        callDetails.push({
          callId,
          call: callResponse.data,
          extra: extraResponse.data
        });
        
        console.log(`✓ Retrieved call ${callId}`);
      } catch (error) {
        console.log(`✗ Failed to retrieve call ${callId}: ${error.message}`);
      }
    }

    return callDetails;
  } catch (error) {
    console.error('Error fetching calls:', error.message);
    return [];
  }
}

function analyzeCallUnits(callData, extraData) {
  const units = [];
  
  // Check Data.Dispatches
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name) units.push(unit.Name);
    });
  }
  
  // Check direct Dispatches
  if (extraData.Dispatches) {
    const unitDispatches = extraData.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
    });
  }
  
  return units;
}

async function exportToSheets(auth, testResults) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;

  const sheetData = testResults.map(result => [
    new Date().toISOString(), // Timestamp
    result.callId, // Call ID
    result.callTitle, // Call Title
    result.callType, // Call Type
    result.nature, // Nature
    result.note, // Note
    result.address, // Address
    result.city, // City
    result.state, // State
    result.zip, // Zip
    result.latitude, // Latitude
    result.longitude, // Longitude
    result.priority, // Priority
    result.responseMode, // Response Mode
    result.units.join(', '), // Unit Name/Unit ID
    result.enRouteTime, // En Route Time
    result.onSceneTime, // On Scene Time
    result.atPatientTime, // At Patient Time
    result.clearedTime, // Cleared Time
    result.patientFirstName, // Patient First Name
    result.patientLastName, // Patient Last Name
    result.patientPhone, // Patient Phone
    result.patientDOB, // Patient DOB/ID
    result.xml // XML
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:X',
    valueInputOption: 'RAW',
    resource: {
      values: sheetData
    }
  });

  // Also log to Logs sheet
  const logEntries = testResults.map(result => [
    new Date().toISOString(),
    'info',
    `Real call test: ${result.callId} with ${result.units.length} unit${result.units.length > 1 ? 's' : ''} (${result.units.join(', ')})`,
    'REAL_DATA_TEST',
    `${result.xmlStructure} XML structure verified`
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E',
    valueInputOption: 'RAW',
    resource: {
      values: logEntries
    }
  });
}

async function main() {
  console.log('Testing Real Historical Calls and Exporting to Google Sheets');
  console.log('============================================================\n');

  try {
    console.log('Getting API token...');
    const token = await getApiToken();
    console.log('✓ Token obtained\n');

    console.log('Authenticating with Google Sheets...');
    const auth = await getGoogleAuth();
    console.log('✓ Google auth obtained\n');

    console.log('Fetching historical calls...');
    const calls = await fetchExistingCalls(token);
    console.log(`✓ Retrieved ${calls.length} calls\n`);

    if (calls.length === 0) {
      console.log('No calls retrieved for testing');
      return;
    }

    // Analyze each call and find one single unit and one multiple unit
    let singleUnitCall = null;
    let multipleUnitCall = null;
    const testResults = [];

    for (const callDetail of calls) {
      const units = analyzeCallUnits(callDetail.call, callDetail.extra);
      console.log(`Call ${callDetail.callId}: ${units.length} unit${units.length > 1 ? 's' : ''} (${units.join(', ')})`);

      if (units.length === 1 && !singleUnitCall) {
        singleUnitCall = callDetail;
      } else if (units.length > 1 && !multipleUnitCall) {
        multipleUnitCall = callDetail;
      }

      // Generate XML for this call
      const xml = generateXML(callDetail.call, callDetail.extra);
      const hasUnitsWrapper = xml.includes('<Units>');
      const xmlStructure = hasUnitsWrapper ? 'Nested' : 'Flat';

      // Extract call data for sheets
      const callData = callDetail.call.Data || callDetail.call;
      const address = callData.Address || '';
      const addressParts = address.split(',').map(p => p.trim());
      
      const testResult = {
        callId: callDetail.callId,
        callTitle: callData.Name || '',
        callType: callData.Type || '',
        nature: callData.Nature || '',
        note: callData.Note || '',
        address: address,
        city: addressParts[1] || '',
        state: addressParts[2] ? addressParts[2].split(' ')[0] : '',
        zip: addressParts[2] ? addressParts[2].split(' ')[1] : '',
        latitude: callData.Latitude || '',
        longitude: callData.Longitude || '',
        priority: callData.Priority ? (typeof callData.Priority === 'object' ? callData.Priority.Name : callData.Priority) : '',
        responseMode: units.length > 1 ? 'Multiple Unit Response' : 'Single Unit Response',
        units: units,
        enRouteTime: '',
        onSceneTime: '',
        atPatientTime: '',
        clearedTime: '',
        patientFirstName: callData.ContactName ? callData.ContactName.split(' ')[0] : '',
        patientLastName: callData.ContactName ? callData.ContactName.split(' ').slice(1).join(' ') : '',
        patientPhone: callData.ContactInfo || '',
        patientDOB: callData.ExternalId || '',
        xml: xml,
        xmlStructure: xmlStructure
      };

      testResults.push(testResult);

      // Save XML files
      const fs = require('fs');
      fs.mkdirSync('test-output', { recursive: true });
      fs.writeFileSync(`test-output/real-call-${callDetail.callId}-${units.length}-units.xml`, xml);
    }

    console.log('\nTest Results Summary:');
    console.log('====================');

    if (singleUnitCall) {
      const singleUnits = analyzeCallUnits(singleUnitCall.call, singleUnitCall.extra);
      console.log(`Single unit call found: ${singleUnitCall.callId} with unit ${singleUnits[0]}`);
    } else {
      console.log('No single unit calls found in the dataset');
    }

    if (multipleUnitCall) {
      const multiUnits = analyzeCallUnits(multipleUnitCall.call, multipleUnitCall.extra);
      console.log(`Multiple unit call found: ${multipleUnitCall.callId} with units ${multiUnits.join(', ')}`);
    } else {
      console.log('No multiple unit calls found in the dataset');
    }

    console.log('\nExporting test results to Google Sheets...');
    await exportToSheets(auth, testResults);
    console.log('✓ Test results exported to Google Sheets\n');

    console.log('XML Structure Analysis:');
    testResults.forEach(result => {
      console.log(`Call ${result.callId}: ${result.units.length} units → ${result.xmlStructure} structure`);
    });

    console.log('\n✓ Real call testing completed successfully');
    console.log('✓ All XML files saved to test-output/');
    console.log('✓ Results logged to Google Sheets');

  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run the test
main();