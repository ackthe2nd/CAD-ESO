/**
 * Verify Call 200806 XML Generation and Google Sheets Consistency
 * Check if the recent call uses correct XML format and matches across all sheets
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');

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
  }

  return new google.auth.GoogleAuth({
    credentials: serviceAccount,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
}

async function fetchCallData(token, callId) {
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
    return null;
  }
}

async function checkGoogleSheetsData(auth, callId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Checking Google Sheets for call', callId);
  
  // Check Call Data sheet
  try {
    const callDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A:X'
    });
    
    const rows = callDataResponse.data.values || [];
    const callRow = rows.find(row => row[1] === callId);
    
    if (callRow) {
      console.log('Found call in Call Data sheet:');
      console.log(`  Call ID: ${callRow[1]}`);
      console.log(`  Units: ${callRow[8]}`);
      console.log(`  Unit Count: ${callRow[21]}`);
      console.log(`  XML Length: ${callRow[22] ? callRow[22].length : 0} characters`);
      
      return {
        foundInCallData: true,
        units: callRow[8],
        unitCount: parseInt(callRow[21]) || 0,
        xml: callRow[22] || ''
      };
    }
  } catch (error) {
    console.error('Error checking Call Data sheet:', error.message);
  }
  
  return { foundInCallData: false };
}

function analyzeUnitsAndXML(callData, extraData, sheetsData) {
  console.log('\n=== UNIT AND XML ANALYSIS ===');
  
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  // Extract units from call data
  const units = [];
  
  if (extra.Dispatches) {
    const unitDispatches = extra.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name) units.push(unit.Name);
    });
  }
  
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
    });
  }
  
  console.log(`API Units Found: ${units.length > 0 ? units.join(', ') : 'None'}`);
  console.log(`Sheets Units: ${sheetsData.units || 'None'}`);
  console.log(`Expected XML Structure: ${units.length > 1 ? 'Nested (Multiple Units)' : 'Flat (Single Unit)'}`);
  
  // Generate correct XML
  const correctXML = generateXML(callData, extraData);
  
  // Analyze XML structure
  const hasUnitsWrapper = correctXML.includes('<Units>');
  const hasEmsUnitCallSign = correctXML.includes('<EmsUnitCallSign>');
  const unitCount = (correctXML.match(/<Unit>/g) || []).length;
  
  console.log('\nCorrect XML Analysis:');
  console.log(`  Has <Units> wrapper: ${hasUnitsWrapper}`);
  console.log(`  Has <EmsUnitCallSign>: ${hasEmsUnitCallSign}`);
  console.log(`  <Unit> elements: ${unitCount}`);
  console.log(`  XML size: ${correctXML.length} characters`);
  
  // Compare with sheets XML
  if (sheetsData.xml) {
    const sheetsHasUnitsWrapper = sheetsData.xml.includes('<Units>');
    const sheetsHasEmsUnitCallSign = sheetsData.xml.includes('<EmsUnitCallSign>');
    const sheetsUnitCount = (sheetsData.xml.match(/<Unit>/g) || []).length;
    
    console.log('\nSheets XML Analysis:');
    console.log(`  Has <Units> wrapper: ${sheetsHasUnitsWrapper}`);
    console.log(`  Has <EmsUnitCallSign>: ${sheetsHasEmsUnitCallSign}`);
    console.log(`  <Unit> elements: ${sheetsUnitCount}`);
    console.log(`  XML size: ${sheetsData.xml.length} characters`);
    
    const xmlMatches = correctXML === sheetsData.xml;
    console.log(`\nXML Consistency: ${xmlMatches ? 'MATCHES' : 'MISMATCH'}`);
    
    if (!xmlMatches) {
      console.log('\n=== XML MISMATCH DETECTED ===');
      console.log('The XML in Google Sheets does not match the current XML generation logic.');
      console.log('This may indicate the sheets were populated before the recent updates.');
    }
  }
  
  return {
    apiUnits: units,
    correctXML,
    expectedStructure: units.length > 1 ? 'nested' : 'flat',
    xmlMatches: sheetsData.xml === correctXML
  };
}

async function updateSheetsWithCorrectXML(auth, callId, callData, extraData, correctXML) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('\n=== UPDATING GOOGLE SHEETS ===');
  
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  // Extract units
  const units = [];
  if (extra.Dispatches) {
    const unitDispatches = extra.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name) units.push(unit.Name);
    });
  }
  
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
    });
  }
  
  // Parse address
  const address = call.Address || '';
  const addressParts = address.split(',').map(p => p.trim());
  const city = addressParts[1] || '';
  const state = addressParts[2] ? addressParts[2].split(' ')[0] : '';
  const zip = addressParts[2] ? addressParts[2].split(' ')[1] : '';
  
  // Create updated entry
  const updatedEntry = [
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
    '', // En Route Time
    '', // On Scene Time
    '', // At Patient Time
    '', // Cleared Time
    '', // Back In Service Time
    call.Latitude || '', // Latitude
    call.Longitude || '', // Longitude
    call.ContactName || '', // Contact Name
    call.ContactInfo || '', // Contact Info
    call.ExternalId || '', // External ID
    new Date().toISOString(), // Last Updated
    units.length, // Unit Count
    correctXML // Correct XML
  ];
  
  // Find and update the existing row
  const callDataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:X'
  });
  
  const rows = callDataResponse.data.values || [];
  const rowIndex = rows.findIndex(row => row[1] === callId);
  
  if (rowIndex > 0) { // Found existing row (skip header)
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `Call Data!A${rowIndex + 1}:X${rowIndex + 1}`,
      valueInputOption: 'RAW',
      resource: {
        values: [updatedEntry]
      }
    });
    console.log(`Updated existing row ${rowIndex + 1} in Call Data sheet`);
  } else {
    // Add new row
    await sheets.spreadsheets.values.append({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A:X',
      valueInputOption: 'RAW',
      resource: {
        values: [updatedEntry]
      }
    });
    console.log('Added new row to Call Data sheet');
  }
  
  // Log the correction
  const logEntry = [
    new Date().toISOString(),
    'info',
    `Call ${callId} XML updated to correct ${units.length > 1 ? 'multiple unit nested' : 'single unit flat'} structure`,
    'XML_CORRECTION',
    `Units: ${units.join(', ')} | XML size: ${correctXML.length} bytes`
  ];
  
  await sheets.spreadsheets.values.append({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E',
    valueInputOption: 'RAW',
    resource: {
      values: [logEntry]
    }
  });
  
  console.log('Logged XML correction to main Logs sheet');
}

async function main() {
  console.log('Verifying Call 200806 XML Generation and Google Sheets Consistency');
  console.log('================================================================\n');
  
  const token = await getResgridToken();
  const auth = await getGoogleAuth();
  
  // Fetch call data
  const callData = await fetchCallData(token, '200806');
  if (!callData) {
    console.error('Failed to fetch call data');
    return;
  }
  
  // Check Google Sheets data
  const sheetsData = await checkGoogleSheetsData(auth, '200806');
  
  // Analyze units and XML
  const analysis = analyzeUnitsAndXML(callData.call, callData.extra, sheetsData);
  
  // Save correct XML for reference
  fs.mkdirSync('test-output', { recursive: true });
  fs.writeFileSync('test-output/call-200806-correct.xml', analysis.correctXML);
  
  console.log('\n=== SUMMARY ===');
  console.log(`Call ID: 200806`);
  console.log(`Units found: ${analysis.apiUnits.length} (${analysis.apiUnits.join(', ') || 'None'})`);
  console.log(`Expected structure: ${analysis.expectedStructure}`);
  console.log(`XML consistency: ${analysis.xmlMatches ? 'CORRECT' : 'NEEDS UPDATE'}`);
  
  if (!analysis.xmlMatches && sheetsData.foundInCallData) {
    console.log('\nUpdating Google Sheets with correct XML...');
    await updateSheetsWithCorrectXML(auth, '200806', callData.call, callData.extra, analysis.correctXML);
    console.log('Google Sheets updated successfully');
  }
  
  console.log(`\nCorrect XML saved to: test-output/call-200806-correct.xml`);
}

main().catch(error => {
  console.error('Verification failed:', error.message);
});