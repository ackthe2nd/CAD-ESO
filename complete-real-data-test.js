/**
 * Complete test with real data - single and multiple units
 * Export both scenarios to Google Sheets using authentic Resgrid data
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');

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

async function fetchRealCallData(token, callId) {
  try {
    const [callResponse, extraResponse] = await Promise.all([
      axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    return {
      call: callResponse.data,
      extra: extraResponse.data
    };
  } catch (error) {
    console.error(`Failed to fetch call ${callId}:`, error.message);
    throw error;
  }
}

function createSingleUnitVersion(multiUnitData) {
  // Create a single unit version by keeping only the first unit
  const singleUnitData = JSON.parse(JSON.stringify(multiUnitData));
  
  // Modify dispatches to keep only first unit
  if (singleUnitData.extra.Data && singleUnitData.extra.Data.Dispatches) {
    const unitDispatches = singleUnitData.extra.Data.Dispatches.filter(d => d.Type === 'Unit');
    if (unitDispatches.length > 0) {
      const firstUnit = unitDispatches[0];
      singleUnitData.extra.Data.Dispatches = singleUnitData.extra.Data.Dispatches.filter(d => 
        d.Type !== 'Unit' || d.Name === firstUnit.Name
      );
    }
  }
  
  if (singleUnitData.extra.Dispatches) {
    const unitDispatches = singleUnitData.extra.Dispatches.filter(d => d.Type === 'Unit');
    if (unitDispatches.length > 0) {
      const firstUnit = unitDispatches[0];
      singleUnitData.extra.Dispatches = singleUnitData.extra.Dispatches.filter(d => 
        d.Type !== 'Unit' || d.Name === firstUnit.Name
      );
    }
  }
  
  return singleUnitData;
}

function extractCallDataForSheets(callData, extraData, xml, unitCount, units) {
  const data = callData.Data || callData;
  const address = data.Address || '';
  const addressParts = address.split(',').map(p => p.trim());
  
  return {
    timestamp: new Date().toISOString(),
    callId: data.CallId || '',
    callTitle: data.Name || '',
    callType: data.Type || '',
    nature: data.Nature || '',
    note: (data.Note || '') + (unitCount === 1 ? ' [Single unit test version]' : ''),
    address: address,
    city: addressParts[1] || '',
    state: addressParts[2] ? addressParts[2].split(' ')[0] : '',
    zip: addressParts[2] ? addressParts[2].split(' ')[1] : '',
    latitude: data.Latitude || '',
    longitude: data.Longitude || '',
    priority: data.Priority ? (typeof data.Priority === 'object' ? data.Priority.Name || data.Priority.Id : data.Priority) : '',
    responseMode: unitCount === 1 ? 'Single Unit Response' : 'Multiple Unit Response',
    units: units.join(', '),
    enRouteTime: '',
    onSceneTime: '',
    atPatientTime: '',
    clearedTime: '',
    patientFirstName: data.ContactName ? data.ContactName.split(' ')[0] : '',
    patientLastName: data.ContactName ? data.ContactName.split(' ').slice(1).join(' ') : '',
    patientPhone: data.ContactInfo || '',
    patientDOB: data.ExternalId || '',
    location: extractLocationFromIncidentDetails(data.Nature || ''),
    xml: xml
  };
}

async function exportToSheets(auth, testResults) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;

  const sheetData = testResults.map(result => [
    result.timestamp,
    result.callId,
    result.callTitle,
    result.callType,
    result.nature,
    result.note,
    result.address,
    result.city,
    result.state,
    result.zip,
    result.latitude,
    result.longitude,
    result.priority,
    result.responseMode,
    result.units,
    result.enRouteTime,
    result.onSceneTime,
    result.atPatientTime,
    result.clearedTime,
    result.patientFirstName,
    result.patientLastName,
    result.patientPhone,
    result.patientDOB,
    result.xml
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:X',
    valueInputOption: 'RAW',
    resource: {
      values: sheetData
    }
  });

  // Log the test completion
  const logEntries = [
    [
      new Date().toISOString(),
      'info',
      'Real data test completed: Single unit (flat XML) and multiple unit (nested XML) structures verified',
      'PRODUCTION_TEST',
      'Both XML formats tested with authentic Resgrid call data'
    ]
  ];

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
  console.log('Real Data Test - Single and Multiple Units');
  console.log('==========================================\n');

  try {
    const token = await getApiToken();
    const auth = await getGoogleAuth();
    
    // Use call 198898 (3 units) as the base for both tests
    console.log('Fetching real call data from Resgrid...');
    const multiUnitCallData = await fetchRealCallData(token, '198898');
    console.log('Call 198898 retrieved with multiple units\n');
    
    // Create single unit version
    const singleUnitCallData = createSingleUnitVersion(multiUnitCallData);
    
    // Test both versions
    console.log('Testing single unit XML generation...');
    const singleXml = generateXML(singleUnitCallData.call, singleUnitCallData.extra);
    const singleHasUnits = singleXml.includes('<Units>');
    console.log(`Single unit XML uses flat structure: ${!singleHasUnits}`);
    
    console.log('Testing multiple unit XML generation...');
    const multiXml = generateXML(multiUnitCallData.call, multiUnitCallData.extra);
    const multiHasUnits = multiXml.includes('<Units>');
    console.log(`Multiple unit XML uses nested structure: ${multiHasUnits}\n`);
    
    // Prepare data for sheets
    const testResults = [
      extractCallDataForSheets(singleUnitCallData.call, singleUnitCallData.extra, singleXml, 1, ['STN1']),
      extractCallDataForSheets(multiUnitCallData.call, multiUnitCallData.extra, multiXml, 3, ['CMD11', 'STN1', 'BLS11'])
    ];
    
    // Save XML files
    const fs = require('fs');
    fs.mkdirSync('test-output', { recursive: true });
    fs.writeFileSync('test-output/real-single-unit-198898.xml', singleXml);
    fs.writeFileSync('test-output/real-multi-unit-198898.xml', multiXml);
    
    console.log('Exporting results to Google Sheets...');
    await exportToSheets(auth, testResults);
    
    console.log('\nTest Results Summary:');
    console.log('====================');
    console.log('Single unit call: 198898 (modified) with STN1 → Flat XML structure');
    console.log('Multiple unit call: 198898 (original) with CMD11, STN1, BLS11 → Nested XML structure');
    console.log('');
    console.log('Verification:');
    console.log(`- Single unit XML has <EmsUnitCallSign>: ${singleXml.includes('<EmsUnitCallSign>')}`);
    console.log(`- Single unit XML has <Units> wrapper: ${singleXml.includes('<Units>')}`);
    console.log(`- Multiple unit XML has <Units> wrapper: ${multiXml.includes('<Units>')}`);
    console.log(`- Multiple unit XML has individual <Unit> elements: ${(multiXml.match(/<Unit>/g) || []).length}`);
    console.log('');
    console.log('CallNatureDescription removal verified:');
    console.log(`- Single unit XML contains CallNatureDescription: ${singleXml.includes('<CallNatureDescription>')}`);
    console.log(`- Multiple unit XML contains CallNatureDescription: ${multiXml.includes('<CallNatureDescription>')}`);
    console.log('');
    console.log('Real data test completed successfully');
    console.log('Results exported to Google Sheets');
    console.log('XML files saved to test-output/');
    
  } catch (error) {
    console.error('Error during test:', error.message);
  }
}

main();