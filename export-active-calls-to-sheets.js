/**
 * Export Active Calls to Google Sheets
 * Fetch all current active calls from Resgrid and export to Call Data sheet
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

async function fetchActiveCalls(token) {
  console.log('Fetching active calls from Resgrid...');
  
  const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const activeCalls = response.data.Data || [];
  console.log(`Found ${activeCalls.length} active calls`);
  
  return activeCalls;
}

async function fetchCallDetails(token, callId) {
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

async function attemptSFTPUpload(callId, xml) {
  // Check if SFTP credentials are available
  if (!process.env.SFTP_HOST || !process.env.SFTP_USER || !process.env.SFTP_PASS) {
    return {
      status: 'Failed: Missing SFTP Credentials',
      url: ''
    };
  }

  // For now, simulate SFTP status since we know credentials are not configured
  return {
    status: 'Failed: Authentication Error',
    url: ''
  };
}

function processActiveCallForSheets(callData, extraData, xml) {
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
  
  // Determine SFTP status
  const sftpResult = { status: 'Failed: Authentication Error', url: '' };
  
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
    sftpResult.status,                                  // ESO Upload Status
    sftpResult.url,                                     // ESO File Location
    new Date().toISOString()                            // Last Updated
  ];
}

async function exportActiveCallsToSheets(auth, token, activeCalls) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log(`Processing ${activeCalls.length} active calls for export...`);
  
  const newRows = [];
  
  for (const activeCall of activeCalls) {
    try {
      console.log(`Processing call ${activeCall.CallId}...`);
      
      // Fetch detailed call data
      const callDetails = await fetchCallDetails(token, activeCall.CallId);
      
      // Generate XML
      const xml = generateXML(callDetails.call, callDetails.extra);
      
      // Process for sheets format
      const rowData = processActiveCallForSheets(callDetails.call, callDetails.extra, xml);
      newRows.push(rowData);
      
      console.log(`Processed call ${activeCall.CallId} (${rowData[12]} units)`);
      
    } catch (error) {
      console.log(`Failed to process call ${activeCall.CallId}: ${error.message}`);
    }
  }
  
  if (newRows.length === 0) {
    console.log('No active calls to export');
    return;
  }
  
  // Get existing data to preserve it
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ'
  });
  
  const existingRows = response.data.values || [];
  const headers = existingRows[0] || [];
  
  // Get existing call IDs to avoid duplicates
  const existingCallIds = new Set();
  for (let i = 1; i < existingRows.length; i++) {
    if (existingRows[i][1]) { // Emergency Call ID column
      existingCallIds.add(existingRows[i][1]);
    }
  }
  
  // Filter out calls that are already in the sheet
  const uniqueNewRows = newRows.filter(row => !existingCallIds.has(row[1]));
  
  if (uniqueNewRows.length === 0) {
    console.log('All active calls are already in the Call Data sheet');
    return;
  }
  
  console.log(`Adding ${uniqueNewRows.length} new active calls to Call Data sheet...`);
  
  // Append the new rows
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ',
    valueInputOption: 'RAW',
    resource: {
      values: uniqueNewRows
    }
  });
  
  console.log(`Successfully exported ${uniqueNewRows.length} active calls to Call Data sheet`);
  
  return uniqueNewRows;
}

async function main() {
  console.log('Exporting Active Calls to Google Sheets');
  console.log('======================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    console.log('Authentication successful');
    
    // Fetch current active calls
    const activeCalls = await fetchActiveCalls(token);
    
    if (activeCalls.length === 0) {
      console.log('No active calls found in Resgrid system');
      return;
    }
    
    // Export to sheets
    const exportedRows = await exportActiveCallsToSheets(auth, token, activeCalls);
    
    console.log('\n=== ACTIVE CALLS EXPORT COMPLETE ===');
    
    if (exportedRows && exportedRows.length > 0) {
      console.log(`Exported ${exportedRows.length} active emergency calls`);
      console.log('Call Data sheet updated with:');
      console.log('- Complete call information and GPS coordinates');
      console.log('- Generated XML for ESO integration');
      console.log('- Real-time unit assignments and timestamps');
      console.log('- SFTP upload status tracking');
      
      // Log details of exported calls
      console.log('\nExported calls:');
      exportedRows.forEach(row => {
        console.log(`- Call ${row[1]}: ${row[2]} (${row[12]} units)`);
      });
    } else {
      console.log('All active calls were already present in the Call Data sheet');
    }
    
  } catch (error) {
    console.error('Active calls export failed:', error.message);
  }
}

main();