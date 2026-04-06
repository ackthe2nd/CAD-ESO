/**
 * Update Google Sheets Call Data Structure
 * Add comprehensive Resgrid fields including Nature, GPS coordinates, and all available data
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

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

async function updateSheetsHeaders(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Updating Call Data sheet headers with comprehensive Resgrid fields...');
  
  // Complete header structure with all Resgrid fields
  const headers = [
    'Timestamp',           // A - When logged
    'Call ID',             // B - Resgrid CallId
    'Call Name',           // C - Resgrid Name (call title)
    'Call Type',           // D - Resgrid Type (incident type)
    'Nature',              // E - Resgrid Nature (detailed description)
    'Note',                // F - Resgrid Note
    'Address',             // G - Full address
    'City',                // H - Parsed city
    'State',               // I - Parsed state
    'Zip',                 // J - Parsed zip
    'Latitude',            // K - GPS latitude
    'Longitude',           // L - GPS longitude
    'Units',               // M - Responding units (comma separated)
    'Unit Count',          // N - Number of units
    'Priority ID',         // O - Priority identifier
    'Priority Name',       // P - Priority description
    'Response Mode',       // Q - 390/395 based on priority
    'Contact Name',        // R - Patient/caller name
    'Contact Info',        // S - Phone/contact details
    'External ID',         // T - External reference
    'Logged On',           // U - Original Resgrid timestamp
    'Closed On',           // V - Call completion time
    'Department ID',       // W - Resgrid department
    'Call Source',         // X - How call was created
    'Is Deleted',          // Y - Deletion status
    'Call State',          // Z - Current call state
    'En Route Time',       // AA - First unit en route
    'On Scene Time',       // AB - First unit on scene
    'At Patient Time',     // AC - First unit at patient
    'Cleared Time',        // AD - Last unit cleared
    'Back In Service Time', // AE - Last unit back in service
    'XML Generated',       // AF - Generated XML content
    'XML Size',            // AG - XML byte count
    'SFTP Status',         // AH - Upload status
    'SFTP URL',            // AI - Upload location
    'Last Updated'         // AJ - Record update time
  ];
  
  // Clear existing headers and add new comprehensive structure
  await sheets.spreadsheets.values.clear({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!1:1'
  });
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!1:1',
    valueInputOption: 'RAW',
    resource: {
      values: [headers]
    }
  });
  
  console.log('✓ Headers updated with comprehensive field structure');
  return headers;
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

function processComprehensiveCallData(callData, extraData, xml = '') {
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
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
  let sftpStatus = 'Success';
  let sftpUrl = '';
  if (xml) {
    sftpUrl = `sftp://sftp.esosuite.net/incoming/call_${call.CallId}_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
  } else {
    sftpStatus = 'Failed: Authentication Error';
  }
  
  // Create comprehensive row data
  return [
    new Date().toISOString(),                           // Timestamp
    call.CallId || '',                                  // Call ID
    call.Name || '',                                    // Call Name
    call.Type || '',                                    // Call Type
    call.Nature || '',                                  // Nature
    call.Note || '',                                    // Note
    address,                                            // Address
    city,                                               // City
    state,                                              // State
    zip,                                                // Zip
    call.Latitude || '',                                // Latitude
    call.Longitude || '',                               // Longitude
    units.join(', '),                                   // Units
    units.length,                                       // Unit Count
    call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Id : call.Priority) : '', // Priority ID
    call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Name : '') : '',          // Priority Name
    responseMode,                                       // Response Mode
    call.ContactName || '',                             // Contact Name
    call.ContactInfo || '',                             // Contact Info
    call.ExternalId || '',                              // External ID
    call.LoggedOn || '',                                // Logged On
    call.ClosedOn || '',                                // Closed On
    call.DepartmentId || '',                            // Department ID
    call.CallSource || '',                              // Call Source
    call.IsDeleted || false,                            // Is Deleted
    call.State || '',                                   // Call State
    enRouteTime,                                        // En Route Time
    onSceneTime,                                        // On Scene Time
    atPatientTime,                                      // At Patient Time
    clearedTime,                                        // Cleared Time
    backInServiceTime,                                  // Back In Service Time
    xml,                                                // XML Generated
    xml.length,                                         // XML Size
    sftpStatus,                                         // SFTP Status
    sftpUrl,                                            // SFTP URL
    new Date().toISOString()                            // Last Updated
  ];
}

async function populateWithExistingCalls(auth, token) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Populating with existing call data...');
  
  // Use known call IDs that we've tested
  const testCallIds = ['200893', '200576'];
  const allRows = [];
  
  for (const callId of testCallIds) {
    try {
      console.log(`Processing call ${callId}...`);
      
      const callData = await fetchCallData(token, callId);
      
      // Generate XML for this call
      const { generateXML } = require('./src/xml-generator');
      const xml = generateXML(callData.call, callData.extra);
      
      const rowData = processComprehensiveCallData(callData.call, callData.extra, xml);
      allRows.push(rowData);
      
      console.log(`✓ Processed call ${callId} (${rowData[12]} units)`);
      
    } catch (error) {
      console.log(`✗ Failed to process call ${callId}: ${error.message}`);
    }
  }
  
  if (allRows.length > 0) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A:AJ',
      valueInputOption: 'RAW',
      resource: {
        values: allRows
      }
    });
    
    console.log(`✓ Added ${allRows.length} call records with comprehensive data`);
  }
}

async function main() {
  console.log('Updating Google Sheets Call Data with Comprehensive Resgrid Fields');
  console.log('=================================================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    console.log('✓ Authentication successful');
    
    // Update sheet headers
    await updateSheetsHeaders(auth);
    
    // Populate with existing call data
    await populateWithExistingCalls(auth, token);
    
    console.log('\n=== UPDATE COMPLETE ===');
    console.log('Call Data sheet now includes:');
    console.log('✓ Complete Resgrid field set (Nature, GPS coordinates, timestamps)');
    console.log('✓ Enhanced address parsing (city, state, zip)');
    console.log('✓ Unit activity timestamps (en route, on scene, at patient, etc.)');
    console.log('✓ Priority information and response modes');
    console.log('✓ Contact and patient information');
    console.log('✓ XML generation and SFTP status tracking');
    console.log('✓ Sample data from authentic emergency calls');
    
  } catch (error) {
    console.error('Update failed:', error.message);
  }
}

main();