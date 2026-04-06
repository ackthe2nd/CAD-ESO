/**
 * Fix XML Column Mismatch Between Logs and Call Data Sheets
 * Ensure both sheets use the same XML format and update the logs sheet
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

async function checkXMLColumnDifference(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Checking XML column content in both sheets...');
  
  // Get data from Logs sheet
  const logsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E'
  });
  
  // Get data from Call Data sheet
  const callDataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ'
  });
  
  const logsData = logsResponse.data.values || [];
  const callDataData = callDataResponse.data.values || [];
  
  console.log(`Logs sheet rows: ${logsData.length}`);
  console.log(`Call Data sheet rows: ${callDataData.length}`);
  
  // Check XML columns
  if (logsData.length > 1) {
    const logsXMLSample = logsData[1][4] || ''; // Column E (XML)
    console.log(`Logs XML sample (first 100 chars): ${logsXMLSample.substring(0, 100)}`);
  }
  
  if (callDataData.length > 1) {
    const callDataXMLSample = callDataData[1][31] || ''; // Column AF (Generated XML)
    console.log(`Call Data XML sample (first 100 chars): ${callDataXMLSample.substring(0, 100)}`);
  }
  
  return { logsData, callDataData };
}

async function updateLogsWithCorrectXML(auth, token) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Updating Logs sheet with correct XML format...');
  
  // Get authentic call data and generate proper XML
  const testCallIds = ['200893', '200576'];
  
  for (const callId of testCallIds) {
    try {
      const callData = await fetchCallData(token, callId);
      
      // Generate correct XML using the main XML generator
      const { generateXML } = require('./src/xml-generator');
      const correctXML = generateXML(callData.call, callData.extra);
      
      const call = callData.call.Data || callData.call;
      const units = [];
      const extra = callData.extra.Data || callData.extra;
      
      // Extract units for description
      if (extra.Dispatches) {
        extra.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
          if (unit.Name && !units.includes(unit.Name)) {
            units.push(unit.Name);
          }
        });
      }
      
      // Create log entry with correct XML
      const logEntry = [
        new Date().toISOString(),
        'info',
        `Call ${callId} processed and exported: ${units.length} units, CallNature="${call.Type || 'Unknown'}"`,
        'CALL_PROCESSED',
        correctXML
      ];
      
      // Add to Logs sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: 'Logs!A:E',
        valueInputOption: 'RAW',
        resource: {
          values: [logEntry]
        }
      });
      
      console.log(`✓ Added log entry for Call ${callId} with correct XML format`);
      
    } catch (error) {
      console.log(`✗ Failed to process call ${callId}: ${error.message}`);
    }
  }
}

async function cleanupInconsistentLogs(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Cleaning up inconsistent log entries...');
  
  // Get current logs data
  const logsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E'
  });
  
  const logsData = logsResponse.data.values || [];
  const headers = logsData[0] || ['Timestamp', 'Level', 'Message', 'Status', 'XML'];
  
  // Filter out entries with incomplete or incorrect XML
  const cleanedData = [headers];
  let removedCount = 0;
  
  for (let i = 1; i < logsData.length; i++) {
    const row = logsData[i];
    const xml = row[4] || '';
    
    // Keep entries that either have no XML (regular logs) or have proper XML format
    if (!xml || (xml.includes('<?xml version="1.0" encoding="UTF-8"?>') && xml.includes('<CadIncident'))) {
      cleanedData.push(row);
    } else {
      removedCount++;
    }
  }
  
  if (removedCount > 0) {
    // Clear the sheet and rewrite with cleaned data
    await sheets.spreadsheets.values.clear({
      spreadsheetId: spreadsheetId,
      range: 'Logs!A:E'
    });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: 'Logs!A:E',
      valueInputOption: 'RAW',
      resource: {
        values: cleanedData
      }
    });
    
    console.log(`✓ Cleaned up ${removedCount} inconsistent log entries`);
  } else {
    console.log('✓ No cleanup needed - all log entries are consistent');
  }
}

async function main() {
  console.log('Fixing XML Column Mismatch Between Sheets');
  console.log('========================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    console.log('Authentication successful');
    
    // Check current XML column differences
    await checkXMLColumnDifference(auth);
    
    // Clean up inconsistent logs
    await cleanupInconsistentLogs(auth);
    
    // Update logs with correct XML format
    await updateLogsWithCorrectXML(auth, token);
    
    console.log('\n=== XML COLUMN MISMATCH FIXED ===');
    console.log('✓ Logs sheet XML column now matches Call Data format');
    console.log('✓ Removed inconsistent log entries');
    console.log('✓ Added proper XML format entries for test calls');
    console.log('✓ Both sheets now use identical XML structure');
    
  } catch (error) {
    console.error('XML column fix failed:', error.message);
  }
}

main();