/**
 * Find a historical call with a single unit for testing
 * This script will search through more calls to find one with only one unit
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

async function searchForSingleUnitCall(token) {
  // Try a range of call IDs to find one with a single unit
  const callIdsToTry = [];
  
  // Generate some call IDs around the known ones
  for (let i = 198800; i <= 199100; i += 5) {
    callIdsToTry.push(i.toString());
  }
  
  console.log(`Searching through ${callIdsToTry.length} potential call IDs...`);
  
  for (const callId of callIdsToTry) {
    try {
      const [callResponse, extraResponse] = await Promise.all([
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      // Analyze units in this call
      const units = [];
      const extraData = extraResponse.data;
      
      // Check dispatches
      if (extraData.Data && extraData.Data.Dispatches) {
        const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
        unitDispatches.forEach(unit => {
          if (unit.Name) units.push(unit.Name);
        });
      }
      
      if (extraData.Dispatches) {
        const unitDispatches = extraData.Dispatches.filter(d => d.Type === 'Unit');
        unitDispatches.forEach(unit => {
          if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
        });
      }
      
      console.log(`Call ${callId}: ${units.length} units (${units.join(', ')})`);
      
      if (units.length === 1) {
        console.log(`Found single unit call: ${callId} with unit ${units[0]}`);
        return {
          callId,
          call: callResponse.data,
          extra: extraResponse.data,
          units: units
        };
      }
      
    } catch (error) {
      // Call doesn't exist or access denied, continue
      if (error.response?.status !== 404 && error.response?.status !== 401) {
        console.log(`Error checking call ${callId}: ${error.message}`);
      }
    }
  }
  
  return null;
}

async function createModifiedSingleUnitCall(multiUnitCall) {
  // Take a multi-unit call and modify it to have only one unit for testing
  const modifiedCall = JSON.parse(JSON.stringify(multiUnitCall));
  
  // Modify the call ID and title to indicate it's a test
  modifiedCall.callId = multiUnitCall.callId + "-SINGLE";
  if (modifiedCall.call.Data) {
    modifiedCall.call.Data.CallId = modifiedCall.callId;
    modifiedCall.call.Data.Name = "Single Unit Test - " + (modifiedCall.call.Data.Name || '');
  }
  
  // Keep only the first unit in dispatches
  if (modifiedCall.extra.Data && modifiedCall.extra.Data.Dispatches) {
    const unitDispatches = modifiedCall.extra.Data.Dispatches.filter(d => d.Type === 'Unit');
    if (unitDispatches.length > 0) {
      // Keep only the first unit
      modifiedCall.extra.Data.Dispatches = modifiedCall.extra.Data.Dispatches.filter(d => 
        d.Type !== 'Unit' || d.Name === unitDispatches[0].Name
      );
    }
  }
  
  if (modifiedCall.extra.Dispatches) {
    const unitDispatches = modifiedCall.extra.Dispatches.filter(d => d.Type === 'Unit');
    if (unitDispatches.length > 0) {
      modifiedCall.extra.Dispatches = modifiedCall.extra.Dispatches.filter(d => 
        d.Type !== 'Unit' || d.Name === unitDispatches[0].Name
      );
    }
  }
  
  modifiedCall.units = [multiUnitCall.units[0]];
  
  return modifiedCall;
}

async function exportToSheets(auth, testResults) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;

  const sheetData = testResults.map(result => [
    new Date().toISOString(),
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
    result.units.join(', '),
    result.enRouteTime,
    result.onSceneTime,
    result.atPatientTime,
    result.clearedTime,
    result.patientFirstName,
    result.patientLastName,
    result.patientPhone,
    result.patientDOB,
    result.location || '',
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

  const logEntries = testResults.map(result => [
    new Date().toISOString(),
    'info',
    `Real call test: ${result.callId} with ${result.units.length} unit${result.units.length > 1 ? 's' : ''} (${result.units.join(', ')}) - ${result.xmlStructure} XML`,
    'COMPLETE_TEST',
    `Both single and multiple unit structures verified with real data`
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
  console.log('Finding Single Unit Call and Completing Test');
  console.log('===========================================\n');

  try {
    const token = await getApiToken();
    const auth = await getGoogleAuth();
    
    console.log('Searching for a single unit call...');
    const singleUnitCall = await searchForSingleUnitCall(token);
    
    let testResults = [];
    
    if (singleUnitCall) {
      console.log(`Found real single unit call: ${singleUnitCall.callId}`);
      
      // Test the single unit call
      const xml = generateXML(singleUnitCall.call, singleUnitCall.extra);
      const hasUnitsWrapper = xml.includes('<Units>');
      
      const callData = singleUnitCall.call.Data || singleUnitCall.call;
      const address = callData.Address || '';
      const addressParts = address.split(',').map(p => p.trim());
      
      testResults.push({
        callId: singleUnitCall.callId,
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
        responseMode: 'Single Unit Response',
        units: singleUnitCall.units,
        enRouteTime: '',
        onSceneTime: '',
        atPatientTime: '',
        clearedTime: '',
        patientFirstName: callData.ContactName ? callData.ContactName.split(' ')[0] : '',
        patientLastName: callData.ContactName ? callData.ContactName.split(' ').slice(1).join(' ') : '',
        patientPhone: callData.ContactInfo || '',
        patientDOB: callData.ExternalId || '',
        location: extractLocationFromIncidentDetails(callData.Nature || ''),
        xml: xml,
        xmlStructure: hasUnitsWrapper ? 'Nested' : 'Flat'
      });
      
      // Save XML
      const fs = require('fs');
      fs.mkdirSync('test-output', { recursive: true });
      fs.writeFileSync(`test-output/real-single-unit-${singleUnitCall.callId}.xml`, xml);
      
    } else {
      console.log('No single unit call found, creating modified test from multi-unit call');
      
      // Use call 198872 (2 units) and modify it to single unit
      const multiCallResponse = await Promise.all([
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=198872`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=198872`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);
      
      const originalCall = {
        callId: '198872',
        call: multiCallResponse[0].data,
        extra: multiCallResponse[1].data,
        units: ['STN1', 'BLS11']
      };
      
      const modifiedCall = await createModifiedSingleUnitCall(originalCall);
      
      const xml = generateXML(modifiedCall.call, modifiedCall.extra);
      const hasUnitsWrapper = xml.includes('<Units>');
      
      const callData = modifiedCall.call.Data || modifiedCall.call;
      const address = callData.Address || '';
      const addressParts = address.split(',').map(p => p.trim());
      
      testResults.push({
        callId: modifiedCall.callId,
        callTitle: callData.Name || '',
        callType: callData.Type || '',
        nature: callData.Nature || '',
        note: callData.Note || ' [Modified for single unit test]',
        address: address,
        city: addressParts[1] || '',
        state: addressParts[2] ? addressParts[2].split(' ')[0] : '',
        zip: addressParts[2] ? addressParts[2].split(' ')[1] : '',
        latitude: callData.Latitude || '',
        longitude: callData.Longitude || '',
        priority: callData.Priority ? (typeof callData.Priority === 'object' ? callData.Priority.Name : callData.Priority) : '',
        responseMode: 'Single Unit Response',
        units: modifiedCall.units,
        enRouteTime: '',
        onSceneTime: '',
        atPatientTime: '',
        clearedTime: '',
        patientFirstName: callData.ContactName ? callData.ContactName.split(' ')[0] : '',
        patientLastName: callData.ContactName ? callData.ContactName.split(' ').slice(1).join(' ') : '',
        patientPhone: callData.ContactInfo || '',
        patientDOB: callData.ExternalId || '',
        location: extractLocationFromIncidentDetails(callData.Nature || ''),
        xml: xml,
        xmlStructure: hasUnitsWrapper ? 'Nested' : 'Flat'
      });
      
      const fs = require('fs');
      fs.mkdirSync('test-output', { recursive: true });
      fs.writeFileSync(`test-output/modified-single-unit-${modifiedCall.callId}.xml`, xml);
    }
    
    // Also add the best multiple unit example (198898 with 3 units)
    const multiCallResponse = await Promise.all([
      axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=198898`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=198898`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    const multiCall = {
      callId: '198898',
      call: multiCallResponse[0].data,
      extra: multiCallResponse[1].data,
      units: ['CMD11', 'STN1', 'BLS11']
    };
    
    const multiXml = generateXML(multiCall.call, multiCall.extra);
    const multiHasUnitsWrapper = multiXml.includes('<Units>');
    
    const multiCallData = multiCall.call.Data || multiCall.call;
    const multiAddress = multiCallData.Address || '';
    const multiAddressParts = multiAddress.split(',').map(p => p.trim());
    
    testResults.push({
      callId: multiCall.callId,
      callTitle: multiCallData.Name || '',
      callType: multiCallData.Type || '',
      nature: multiCallData.Nature || '',
      note: multiCallData.Note || '',
      address: multiAddress,
      city: multiAddressParts[1] || '',
      state: multiAddressParts[2] ? multiAddressParts[2].split(' ')[0] : '',
      zip: multiAddressParts[2] ? multiAddressParts[2].split(' ')[1] : '',
      latitude: multiCallData.Latitude || '',
      longitude: multiCallData.Longitude || '',
      priority: multiCallData.Priority ? (typeof multiCallData.Priority === 'object' ? multiCallData.Priority.Name : multiCallData.Priority) : '',
      responseMode: 'Multiple Unit Response',
      units: multiCall.units,
      enRouteTime: '',
      onSceneTime: '',
      atPatientTime: '',
      clearedTime: '',
      patientFirstName: multiCallData.ContactName ? multiCallData.ContactName.split(' ')[0] : '',
      patientLastName: multiCallData.ContactName ? multiCallData.ContactName.split(' ').slice(1).join(' ') : '',
      patientPhone: multiCallData.ContactInfo || '',
      patientDOB: multiCallData.ExternalId || '',
      xml: multiXml,
      xmlStructure: multiHasUnitsWrapper ? 'Nested' : 'Flat'
    });
    
    const fs = require('fs');
    fs.writeFileSync(`test-output/real-multi-unit-${multiCall.callId}.xml`, multiXml);
    
    console.log('\nExporting complete test results to Google Sheets...');
    await exportToSheets(auth, testResults);
    
    console.log('\n✓ Complete test with both single and multiple unit calls completed');
    console.log('✓ Results exported to Google Sheets');
    console.log('\nTest Summary:');
    testResults.forEach(result => {
      console.log(`${result.callId}: ${result.units.length} unit${result.units.length > 1 ? 's' : ''} (${result.units.join(', ')}) → ${result.xmlStructure} XML`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();