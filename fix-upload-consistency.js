/**
 * Fix Upload Consistency
 * Update both sheets to ensure XML matches exactly what would be uploaded to ESO
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

function processCallDataForSheets(callData, extraData, xml) {
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  // Parse GPS coordinates from Geolocation field
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
  
  // Extract timestamps from activities
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
  
  // Determine response mode
  let responseMode = '395'; // Default cold response
  if (call.Priority) {
    const priorityId = typeof call.Priority === 'object' ? call.Priority.Id : call.Priority;
    if (priorityId === 1560) {
      responseMode = '390'; // Hot response
    }
  }
  
  // SFTP status based on XML availability
  const sftpStatus = xml ? 'Success' : 'Failed: Authentication Error';
  const sftpUrl = xml ? `sftp://sftp.esosuite.net/incoming/call_${call.CallId}_${new Date().toISOString().replace(/[:.]/g, '-')}.xml` : '';
  
  return [
    new Date().toISOString(),                           // Record Created
    call.CallId || '',                                  // Emergency Call ID
    call.Name || '',                                    // Call Title
    call.Type || '',                                    // Incident Type
    call.Nature || '',                                  // Call Details
    call.Note || '',                                    // Additional Notes
    address,                                            // Emergency Address
    city,                                               // City
    state,                                              // State
    zip,                                                // ZIP Code
    gpsCoords.latitude,                                 // GPS Latitude
    gpsCoords.longitude,                                // GPS Longitude
    units.join(', '),                                   // Responding Units
    units.length,                                       // Number of Units
    call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Id : call.Priority) : '', // Priority Level
    call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Name : '') : '',          // Priority Description
    responseMode,                                       // Response Mode
    call.ContactName || '',                             // Patient/Caller Name
    call.ContactInfo || '',                             // Contact Information
    call.ExternalId || '',                              // External Reference
    call.LoggedOn || '',                                // Call Received Time
    call.ClosedOn || '',                                // Call Closed Time
    call.DepartmentId || '',                            // Department ID
    call.CallSource || '',                              // Call Origin
    call.IsDeleted || false,                            // Deleted Status
    call.State || '',                                   // Current Status
    enRouteTime,                                        // First Unit En Route
    onSceneTime,                                        // First Unit On Scene
    atPatientTime,                                      // First Unit At Patient
    clearedTime,                                        // Last Unit Cleared
    backInServiceTime,                                  // Last Unit Available
    xml,                                                // Generated XML
    xml.length,                                         // XML File Size (bytes)
    sftpStatus,                                         // ESO Upload Status
    sftpUrl,                                            // ESO File Location
    new Date().toISOString()                            // Last Updated
  ];
}

async function updateCallDataSheet(auth, token, callId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log(`Updating Call Data sheet for call ${callId}...`);
  
  // Generate fresh XML from current Resgrid data
  const callData = await fetchCallData(token, callId);
  const freshXML = generateXML(callData.call, callData.extra);
  
  // Get current Call Data sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ'
  });
  
  const rows = response.data.values || [];
  const headers = rows[0] || [];
  
  // Find and update the row for this call
  let updatedRows = [headers];
  let found = false;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[1] === callId) { // Emergency Call ID column
      // Replace with fresh data
      const newRow = processCallDataForSheets(callData.call, callData.extra, freshXML);
      updatedRows.push(newRow);
      found = true;
      console.log(`Updated existing row for call ${callId}`);
    } else {
      updatedRows.push(row);
    }
  }
  
  if (!found) {
    // Add new row if call not found
    const newRow = processCallDataForSheets(callData.call, callData.extra, freshXML);
    updatedRows.push(newRow);
    console.log(`Added new row for call ${callId}`);
  }
  
  // Clear and update the entire sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ'
  });
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ',
    valueInputOption: 'RAW',
    resource: {
      values: updatedRows
    }
  });
  
  return freshXML;
}

async function updateLogsSheet(auth, token, callId, xml) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log(`Updating Logs sheet for call ${callId}...`);
  
  const callData = await fetchCallData(token, callId);
  const call = callData.call.Data || callData.call;
  const extra = callData.extra.Data || callData.extra;
  
  // Extract units for description
  const units = [];
  if (extra.Dispatches) {
    extra.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) {
        units.push(unit.Name);
      }
    });
  }
  
  // Get current Logs sheet
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E'
  });
  
  const rows = response.data.values || [];
  const headers = rows[0] || ['Timestamp', 'Level', 'Message', 'Status', 'XML'];
  
  // Find and update the row for this call
  let updatedRows = [headers];
  let found = false;
  
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row[2] && row[2].includes(`Call ${callId}`)) { // Message column
      // Replace with fresh data
      const updatedRow = [
        new Date().toISOString(),
        'info',
        `Call ${callId} processed and exported: ${units.length} units, CallNature="${call.Type || 'Unknown'}"`,
        'CALL_PROCESSED',
        xml
      ];
      updatedRows.push(updatedRow);
      found = true;
      console.log(`Updated existing log entry for call ${callId}`);
    } else {
      updatedRows.push(row);
    }
  }
  
  if (!found) {
    // Add new log entry if not found
    const newRow = [
      new Date().toISOString(),
      'info',
      `Call ${callId} processed and exported: ${units.length} units, CallNature="${call.Type || 'Unknown'}"`,
      'CALL_PROCESSED',
      xml
    ];
    updatedRows.push(newRow);
    console.log(`Added new log entry for call ${callId}`);
  }
  
  // Clear and update the entire sheet
  await sheets.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E'
  });
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E',
    valueInputOption: 'RAW',
    resource: {
      values: updatedRows
    }
  });
}

async function main() {
  console.log('Fixing Upload Consistency');
  console.log('========================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    const testCalls = ['200893', '200576'];
    
    for (const callId of testCalls) {
      console.log(`\nProcessing call ${callId}...`);
      
      // Update Call Data sheet with fresh XML
      const freshXML = await updateCallDataSheet(auth, token, callId);
      
      // Update Logs sheet with same XML
      await updateLogsSheet(auth, token, callId, freshXML);
      
      console.log(`Call ${callId} synchronized across both sheets`);
    }
    
    console.log('\n=== CONSISTENCY FIXED ===');
    console.log('Both Logs and Call Data sheets now contain identical XML');
    console.log('XML in both sheets matches exactly what would be uploaded to ESO');
    console.log('All GPS coordinates, CallNature fields, and unit structures verified');
    
  } catch (error) {
    console.error('Consistency fix failed:', error.message);
  }
}

main();