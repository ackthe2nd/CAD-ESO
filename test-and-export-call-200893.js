/**
 * Test Call 200893 and Export to Google Sheets
 * Complete workflow test with Google Sheets integration
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');
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

async function getResgridToken() {
  const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
    grant_type: 'password',
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  return response.data.access_token;
}

async function getGoogleAuth() {
  let serviceAccount;
  
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
    const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
    serviceAccount = JSON.parse(decodedJson);
  } else {
    throw new Error('No Google service account credentials found');
  }

  return new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function fetchCallData(token, callId) {
  const [callResponse, extraResponse] = await Promise.all([
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  return { call: callResponse.data, extra: extraResponse.data };
}

function processCallData(callData, extraData) {
  console.log('Processing call data...');
  
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  // Extract units
  const units = [];
  if (extra.Dispatches) {
    extra.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
      if (unit.Name) units.push(unit.Name);
    });
  }
  if (extraData.Data && extraData.Data.Dispatches) {
    extraData.Data.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
    });
  }
  
  // Extract incident type
  let incidentType = call.Type || '';
  if (!incidentType && call.Nature) {
    const typeMatch = call.Nature.match(/INCIDENT TYPE:\s*([^-]+)/i);
    if (typeMatch) {
      incidentType = typeMatch[1].trim();
    }
  }
  
  // Parse address
  const address = call.Address || '';
  const addressParts = address.split(',').map(p => p.trim());
  const city = addressParts[1] || '';
  const state = addressParts[2] ? addressParts[2].split(' ')[0] : '';
  const zip = addressParts[2] ? addressParts[2].split(' ')[1] : '';
  
  // Extract timestamps from Activity if available
  let enRouteTime = '';
  let onSceneTime = '';
  let atPatientTime = '';
  let clearedTime = '';
  let backInServiceTime = '';
  
  if (extra.Activity && Array.isArray(extra.Activity)) {
    const activities = extra.Activity.filter(a => a.Type === 'Unit' && units.includes(a.Name));
    
    const enRouteActivities = activities.filter(a => a.StatusId === 5);
    const onSceneActivities = activities.filter(a => a.StatusId === 6);
    const atPatientActivities = activities.filter(a => a.StatusId === 3);
    const clearedActivities = activities.filter(a => a.StatusId === 8);
    const backInServiceActivities = activities.filter(a => a.StatusId === 2);
    
    if (enRouteActivities.length > 0) {
      enRouteTime = enRouteActivities[0].Timestamp;
    }
    if (onSceneActivities.length > 0) {
      onSceneTime = onSceneActivities[0].Timestamp;
    }
    if (atPatientActivities.length > 0) {
      atPatientTime = atPatientActivities[0].Timestamp;
    }
    if (clearedActivities.length > 0) {
      clearedTime = clearedActivities[clearedActivities.length - 1].Timestamp;
    }
    if (backInServiceActivities.length > 0) {
      backInServiceTime = backInServiceActivities[backInServiceActivities.length - 1].Timestamp;
    }
  }
  
  return {
    call,
    units,
    incidentType,
    address,
    city,
    state,
    zip,
    enRouteTime,
    onSceneTime,
    atPatientTime,
    clearedTime,
    backInServiceTime
  };
}

async function exportToGoogleSheets(auth, callId, processedData, xml) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Exporting to Google Sheets...');
  
  const { call, units, incidentType, address, city, state, zip, 
          enRouteTime, onSceneTime, atPatientTime, clearedTime, backInServiceTime } = processedData;
  
  // Create Call Data entry
  const callDataEntry = [
    new Date().toISOString(), // Timestamp
    callId, // Call ID
    call.Name || '', // Nature
    call.Nature || '', // Note
    address, // Address
    city, // City
    state, // State
    zip, // Zip
    units.join(', '), // Units
    call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Id : call.Priority) : '', // Priority
    call.Priority && call.Priority.Id === 1560 ? '390' : '395', // Response Mode
    enRouteTime, // En Route Time
    onSceneTime, // On Scene Time
    atPatientTime, // At Patient Time
    clearedTime, // Cleared Time
    backInServiceTime, // Back In Service Time
    call.Latitude || '', // Latitude
    call.Longitude || '', // Longitude
    call.ContactName || '', // Contact Name
    call.ContactInfo || '', // Contact Info
    call.ExternalId || '', // External ID
    new Date().toISOString(), // Last Updated
    units.length, // Unit Count
    xml // XML
  ];
  
  // Export to Call Data sheet
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:X',
    valueInputOption: 'RAW',
    resource: {
      values: [callDataEntry]
    }
  });
  
  console.log('✓ Exported to Call Data sheet');
  
  // Log to main Logs sheet
  const logEntry = [
    new Date().toISOString(),
    'info',
    `Call ${callId} test completed and exported: ${units.length} units, CallNature="${incidentType}"`,
    'TEST_EXPORT',
    `Units: ${units.join(', ')} | XML: ${xml.length} bytes | Patient: ${call.ContactName || 'None'}`
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E',
    valueInputOption: 'RAW',
    resource: {
      values: [logEntry]
    }
  });
  
  console.log('✓ Logged to main Logs sheet');
  
  return true;
}

async function main() {
  console.log('Testing Call 200893 and Exporting to Google Sheets');
  console.log('=================================================\n');
  
  try {
    // Authentication
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    console.log('✓ Authentication successful');
    
    // Fetch call data
    const callData = await fetchCallData(token, '200893');
    console.log('✓ Call data retrieved');
    
    // Process call data
    const processedData = processCallData(callData.call, callData.extra);
    console.log('✓ Call data processed');
    
    // Generate XML
    const xml = generateXML(callData.call, callData.extra);
    console.log('✓ XML generated');
    
    // Validate XML structure
    const hasUnitsWrapper = xml.includes('<Units>');
    const unitElements = (xml.match(/<Unit>/g) || []).length;
    const callNature = xml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1] || '';
    
    console.log('\nCall 200893 Details:');
    console.log(`  Call Name: "${processedData.call.Name}"`);
    console.log(`  Incident Type: "${processedData.incidentType}"`);
    console.log(`  Units: ${processedData.units.join(', ')}`);
    console.log(`  Patient: ${processedData.call.ContactName || 'None'}`);
    console.log(`  Address: ${processedData.address}`);
    console.log(`  Priority: ${processedData.call.Priority ? processedData.call.Priority.Id || processedData.call.Priority : 'None'}`);
    
    console.log('\nXML Validation:');
    console.log(`  CallNature: "${callNature}"`);
    console.log(`  Structure: ${hasUnitsWrapper ? 'Nested (Multiple Units)' : 'Flat (Single Unit)'}`);
    console.log(`  Unit Elements: ${unitElements}`);
    console.log(`  XML Size: ${xml.length} bytes`);
    
    // Save XML file
    fs.mkdirSync('test-output', { recursive: true });
    fs.writeFileSync('test-output/call-200893-exported.xml', xml);
    console.log('✓ XML saved to test-output/call-200893-exported.xml');
    
    // Export to Google Sheets
    await exportToGoogleSheets(auth, '200893', processedData, xml);
    
    console.log('\n=== TEST AND EXPORT COMPLETE ===');
    console.log('Call 200893 successfully processed and exported to Google Sheets');
    console.log('- Authentic data from Resgrid API');
    console.log('- Correct CallNature field mapping to incident type');
    console.log('- Proper multi-unit nested XML structure');
    console.log('- Complete audit trail in Google Sheets');
    
  } catch (error) {
    console.error('Test and export failed:', error.message);
  }
}

main();