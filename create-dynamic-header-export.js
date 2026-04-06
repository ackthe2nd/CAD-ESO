/**
 * Dynamic Header-Based Export System
 * Reads column headers to determine where to place data, allowing column reordering
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');

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

function createHeaderMapping(headers) {
  const mapping = {};
  
  // Map common header variations to field names
  const headerMappings = {
    'Record Created': 'timestamp',
    'Timestamp': 'timestamp',
    'Emergency Call ID': 'callId',
    'Call ID': 'callId',
    'Call Title': 'callTitle',
    'Call Name': 'callTitle',
    'Incident Type': 'incidentType',
    'Call Type': 'incidentType',
    'Call Details': 'nature',
    'Nature': 'nature',
    'Additional Notes': 'note',
    'Note': 'note',
    'Emergency Address': 'address',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'ZIP Code': 'zip',
    'Zip': 'zip',
    'GPS Latitude': 'latitude',
    'Latitude': 'latitude',
    'GPS Longitude': 'longitude',
    'Longitude': 'longitude',
    'Responding Units': 'units',
    'Units': 'units',
    'Number of Units': 'unitCount',
    'Unit Count': 'unitCount',
    'Priority Level': 'priorityId',
    'Priority ID': 'priorityId',
    'Priority Description': 'priorityName',
    'Priority Name': 'priorityName',
    'Response Mode': 'responseMode',
    'Patient/Caller Name': 'contactName',
    'Contact Name': 'contactName',
    'Contact Information': 'contactInfo',
    'External Reference': 'externalId',
    'External ID': 'externalId',
    'Call Received Time': 'loggedOn',
    'Logged On': 'loggedOn',
    'Call Closed Time': 'closedOn',
    'Closed On': 'closedOn',
    'Department ID': 'departmentId',
    'Call Origin': 'callSource',
    'Call Source': 'callSource',
    'Deleted Status': 'isDeleted',
    'Is Deleted': 'isDeleted',
    'Current Status': 'state',
    'Call State': 'state',
    'First Unit En Route': 'enRouteTime',
    'En Route Time': 'enRouteTime',
    'First Unit On Scene': 'onSceneTime',
    'On Scene Time': 'onSceneTime',
    'First Unit At Patient': 'atPatientTime',
    'At Patient Time': 'atPatientTime',
    'Last Unit Cleared': 'clearedTime',
    'Cleared Time': 'clearedTime',
    'Last Unit Available': 'backInServiceTime',
    'Back In Service Time': 'backInServiceTime',
    'Generated XML': 'xml',
    'XML': 'xml',
    'XML File Size (bytes)': 'xmlSize',
    'XML Size': 'xmlSize',
    'ESO Upload Status': 'uploadStatus',
    'SFTP Status': 'uploadStatus',
    'ESO File Location': 'uploadUrl',
    'SFTP URL': 'uploadUrl',
    'Last Updated': 'lastUpdated'
  };
  
  // Create mapping from column index to field name
  headers.forEach((header, index) => {
    const fieldName = headerMappings[header];
    if (fieldName) {
      mapping[fieldName] = index;
    }
  });
  
  return mapping;
}

function parseGPSCoordinates(geolocation) {
  if (!geolocation || typeof geolocation !== 'string') {
    return { latitude: '', longitude: '' };
  }
  
  const parts = geolocation.split(',');
  if (parts.length === 2) {
    return {
      latitude: parts[0].trim(),
      longitude: parts[1].trim()
    };
  }
  
  return { latitude: '', longitude: '' };
}

function processCallDataWithMapping(callData, extraData, xml, headerMapping) {
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  // Parse GPS coordinates
  const gpsCoords = parseGPSCoordinates(call.Geolocation);
  
  // Extract units
  const units = [];
  if (extra.Dispatches) {
    extra.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) {
        units.push(unit.Name);
      }
    });
  }
  
  // Parse address components
  const address = call.Address || '';
  const addressParts = address.split(',').map(p => p.trim());
  const city = addressParts[1] || '';
  const stateZip = addressParts[2] || '';
  const state = stateZip.split(' ')[0] || '';
  const zip = stateZip.split(' ')[1] || '';
  
  // Extract timestamps
  let enRouteTime = '';
  let onSceneTime = '';
  let atPatientTime = '';
  let clearedTime = '';
  let backInServiceTime = '';
  
  if (extra.Activity && Array.isArray(extra.Activity)) {
    const unitActivities = extra.Activity.filter(a => a.Type === 'Unit' && units.includes(a.Name));
    
    const enRouteActivities = unitActivities.filter(a => a.StatusId === 5);
    const onSceneActivities = unitActivities.filter(a => a.StatusId === 6);
    const atPatientActivities = unitActivities.filter(a => a.StatusId === 3);
    const clearedActivities = unitActivities.filter(a => a.StatusId === 8);
    const backInServiceActivities = unitActivities.filter(a => a.StatusId === 2);
    
    if (enRouteActivities.length > 0) {
      enRouteTime = enRouteActivities[0].Timestamp || '';
    }
    if (onSceneActivities.length > 0) {
      onSceneTime = onSceneActivities[0].Timestamp || '';
    }
    if (atPatientActivities.length > 0) {
      atPatientTime = atPatientActivities[0].Timestamp || '';
    }
    if (clearedActivities.length > 0) {
      clearedTime = clearedActivities[clearedActivities.length - 1].Timestamp || '';
    }
    if (backInServiceActivities.length > 0) {
      backInServiceTime = backInServiceActivities[backInServiceActivities.length - 1].Timestamp || '';
    }
  }
  
  // Response mode logic
  let responseMode = '395';
  if (call.Priority) {
    const priorityId = typeof call.Priority === 'object' ? call.Priority.Id : call.Priority;
    if (priorityId === 1560) {
      responseMode = '390';
    }
  }
  
  // Create data object with all fields
  const dataFields = {
    timestamp: new Date().toISOString(),
    callId: call.CallId || '',
    callTitle: call.Name || '',
    incidentType: call.Type || '',
    nature: call.Nature || '',
    note: call.Note || '',
    address: address,
    city: city,
    state: state,
    zip: zip,
    latitude: gpsCoords.latitude,
    longitude: gpsCoords.longitude,
    units: units.join(', '),
    unitCount: units.length,
    priorityId: call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Id : call.Priority) : '',
    priorityName: call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Name : '') : '',
    responseMode: responseMode,
    contactName: call.ContactName || '',
    contactInfo: call.ContactInfo || '',
    externalId: call.ExternalId || '',
    loggedOn: call.LoggedOn || '',
    closedOn: call.ClosedOn || '',
    departmentId: call.DepartmentId || '',
    callSource: call.CallSource || '',
    isDeleted: call.IsDeleted || false,
    state: call.State || '',
    enRouteTime: enRouteTime,
    onSceneTime: onSceneTime,
    atPatientTime: atPatientTime,
    clearedTime: clearedTime,
    backInServiceTime: backInServiceTime,
    xml: xml,
    xmlSize: xml.length,
    uploadStatus: 'Failed: Authentication Error',
    uploadUrl: '',
    lastUpdated: new Date().toISOString()
  };
  
  // Create row array based on header mapping
  const maxColumns = Math.max(...Object.values(headerMapping)) + 1;
  const row = new Array(maxColumns).fill('');
  
  // Fill row based on header mapping
  Object.entries(headerMapping).forEach(([fieldName, columnIndex]) => {
    if (dataFields.hasOwnProperty(fieldName)) {
      row[columnIndex] = dataFields[fieldName];
    }
  });
  
  return row;
}

async function getSheetHeaders(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!1:1'
  });
  
  return response.data.values ? response.data.values[0] : [];
}

async function exportCallWithDynamicHeaders(auth, token, callId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log(`Exporting call ${callId} using dynamic header mapping...`);
  
  // Get current headers
  const headers = await getSheetHeaders(auth);
  console.log(`Found ${headers.length} columns in Call Data sheet`);
  
  // Create header mapping
  const headerMapping = createHeaderMapping(headers);
  console.log(`Mapped ${Object.keys(headerMapping).length} fields to columns`);
  
  // Fetch call data
  const [callResponse, extraResponse] = await Promise.all([
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  // Generate XML
  const xml = generateXML(callResponse.data, extraResponse.data);
  
  // Process data using header mapping
  const rowData = processCallDataWithMapping(callResponse.data, extraResponse.data, xml, headerMapping);
  
  // Get all existing data
  const maxColumn = String.fromCharCode(65 + Math.max(rowData.length - 1, 25)); // At least Z
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: `Call Data!A:${maxColumn}`
  });
  
  const existingRows = response.data.values || [];
  const callIdIndex = headerMapping.callId;
  let existingRowIndex = -1;
  
  if (callIdIndex !== undefined) {
    for (let i = 1; i < existingRows.length; i++) {
      if (existingRows[i] && existingRows[i][callIdIndex] === callId) {
        existingRowIndex = i;
        break;
      }
    }
  }
  
  if (existingRowIndex >= 0) {
    // Update existing row - use clear and update to handle varying column counts
    const updateRange = `Call Data!${existingRowIndex + 1}:${existingRowIndex + 1}`;
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId,
      range: updateRange
    });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `Call Data!A${existingRowIndex + 1}`,
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });
    console.log(`Updated existing row for call ${callId}`);
  } else {
    // Add new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A:ZZ',
      valueInputOption: 'RAW',
      resource: {
        values: [rowData]
      }
    });
    console.log(`Added new row for call ${callId}`);
  }
  
  return rowData;
}

async function main() {
  console.log('Testing Dynamic Header-Based Export System');
  console.log('=========================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    console.log('Authentication successful');
    
    // Test with a known call
    const testCallId = '200893';
    const result = await exportCallWithDynamicHeaders(auth, token, testCallId);
    
    console.log('\n=== DYNAMIC HEADER EXPORT COMPLETE ===');
    console.log('System now reads column headers to determine data placement');
    console.log('You can rearrange columns and the export will automatically adapt');
    console.log(`Successfully processed call ${testCallId} with ${result.length} data fields`);
    console.log('\nSupported header variations:');
    console.log('- "Emergency Call ID" or "Call ID" → Call identifier');
    console.log('- "GPS Latitude" or "Latitude" → GPS coordinates');
    console.log('- "ESO Upload Status" or "SFTP Status" → Upload status');
    console.log('- And many more flexible header options...');
    
  } catch (error) {
    console.error('Dynamic header export failed:', error.message);
  }
}

main();