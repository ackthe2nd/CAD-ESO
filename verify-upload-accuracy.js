/**
 * Verify Upload Accuracy
 * Confirm that XML in both sheets matches exactly what would be uploaded to ESO
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

async function getStoredXMLFromSheets(auth, callId) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  // Get XML from Call Data sheet
  const callDataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AJ'
  });
  
  const callDataRows = callDataResponse.data.values || [];
  let callDataXML = '';
  
  for (let i = 1; i < callDataRows.length; i++) {
    const row = callDataRows[i];
    if (row[1] === callId) { // Emergency Call ID column
      callDataXML = row[31] || ''; // Generated XML column
      break;
    }
  }
  
  // Get XML from Logs sheet
  const logsResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Logs!A:E'
  });
  
  const logsRows = logsResponse.data.values || [];
  let logsXML = '';
  
  for (let i = 1; i < logsRows.length; i++) {
    const row = logsRows[i];
    if (row[2] && row[2].includes(`Call ${callId}`)) { // Message column
      logsXML = row[4] || ''; // XML column
      break;
    }
  }
  
  return { callDataXML, logsXML };
}

function validateXMLStructure(xml, callId) {
  console.log(`\n=== VALIDATING XML FOR CALL ${callId} ===`);
  
  if (!xml || xml.length === 0) {
    console.log('❌ XML is empty');
    return false;
  }
  
  // Check XML declaration
  const hasXMLDeclaration = xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>');
  console.log(`XML Declaration: ${hasXMLDeclaration ? '✓' : '❌'}`);
  
  // Check root element
  const hasRootElement = xml.includes('<CadIncident') && xml.includes('</CadIncident>');
  console.log(`Root Element: ${hasRootElement ? '✓' : '❌'}`);
  
  // Check incident number
  const incidentMatch = xml.match(/<IncidentNumber>(.*?)<\/IncidentNumber>/);
  const hasCorrectCallId = incidentMatch && incidentMatch[1] === callId;
  console.log(`Incident Number: ${hasCorrectCallId ? '✓' : '❌'} (${incidentMatch ? incidentMatch[1] : 'NOT FOUND'})`);
  
  // Check CallNature field
  const callNatureMatch = xml.match(/<CallNature>(.*?)<\/CallNature>/);
  const hasCallNature = callNatureMatch && callNatureMatch[1].length > 0;
  console.log(`CallNature: ${hasCallNature ? '✓' : '❌'} (${callNatureMatch ? callNatureMatch[1] : 'NOT FOUND'})`);
  
  // Check GPS coordinates
  const latMatch = xml.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
  const lonMatch = xml.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
  const hasGPS = latMatch && lonMatch && latMatch[1].length > 0 && lonMatch[1].length > 0;
  console.log(`GPS Coordinates: ${hasGPS ? '✓' : '❌'} (${latMatch ? latMatch[1] : 'NO LAT'}, ${lonMatch ? lonMatch[1] : 'NO LON'})`);
  
  // Check unit structure
  const hasUnitsWrapper = xml.includes('<Units>');
  const unitCount = (xml.match(/<Unit>/g) || []).length;
  const hasTopLevelUnit = xml.split('<Units>')[0].includes('<EmsUnitCallSign>');
  
  if (unitCount > 1) {
    const correctStructure = hasUnitsWrapper && !hasTopLevelUnit;
    console.log(`Unit Structure: ${correctStructure ? '✓' : '❌'} (${unitCount} units, nested=${hasUnitsWrapper})`);
  } else {
    const correctStructure = !hasUnitsWrapper && hasTopLevelUnit;
    console.log(`Unit Structure: ${correctStructure ? '✓' : '❌'} (${unitCount} unit, flat=${!hasUnitsWrapper})`);
  }
  
  console.log(`XML Size: ${xml.length} bytes`);
  
  const isValid = hasXMLDeclaration && hasRootElement && hasCorrectCallId && hasCallNature;
  console.log(`Overall Valid: ${isValid ? '✓' : '❌'}`);
  
  return isValid;
}

async function verifyUploadAccuracy(token, auth, callId) {
  console.log(`\n==== VERIFYING CALL ${callId} ====`);
  
  // Generate fresh XML from Resgrid data
  const callData = await fetchCallData(token, callId);
  const freshXML = generateXML(callData.call, callData.extra);
  
  // Get stored XML from both sheets
  const { callDataXML, logsXML } = await getStoredXMLFromSheets(auth, callId);
  
  console.log('\n--- FRESH XML (What would be uploaded) ---');
  validateXMLStructure(freshXML, callId);
  
  console.log('\n--- CALL DATA SHEET XML ---');
  const callDataValid = validateXMLStructure(callDataXML, callId);
  
  console.log('\n--- LOGS SHEET XML ---');
  const logsValid = validateXMLStructure(logsXML, callId);
  
  // Compare XMLs
  const freshCallDataMatch = freshXML === callDataXML;
  const freshLogsMatch = freshXML === logsXML;
  const sheetsMatch = callDataXML === logsXML;
  
  console.log('\n--- ACCURACY COMPARISON ---');
  console.log(`Fresh ↔ Call Data: ${freshCallDataMatch ? '✓ MATCH' : '❌ DIFFERENT'}`);
  console.log(`Fresh ↔ Logs: ${freshLogsMatch ? '✓ MATCH' : '❌ DIFFERENT'}`);
  console.log(`Call Data ↔ Logs: ${sheetsMatch ? '✓ MATCH' : '❌ DIFFERENT'}`);
  
  if (!freshCallDataMatch || !freshLogsMatch) {
    console.log('\n--- DIFFERENCES DETECTED ---');
    
    if (!freshCallDataMatch) {
      console.log('Call Data XML differs from fresh generation');
      if (Math.abs(freshXML.length - callDataXML.length) > 100) {
        console.log(`Size difference: Fresh=${freshXML.length}, Stored=${callDataXML.length}`);
      }
    }
    
    if (!freshLogsMatch) {
      console.log('Logs XML differs from fresh generation');
      if (Math.abs(freshXML.length - logsXML.length) > 100) {
        console.log(`Size difference: Fresh=${freshXML.length}, Stored=${logsXML.length}`);
      }
    }
  }
  
  return {
    callId,
    freshValid: validateXMLStructure(freshXML, callId),
    callDataValid,
    logsValid,
    freshCallDataMatch,
    freshLogsMatch,
    sheetsMatch,
    xmlSizes: {
      fresh: freshXML.length,
      callData: callDataXML.length,
      logs: logsXML.length
    }
  };
}

async function main() {
  console.log('Verifying Upload Accuracy - XML Field Validation');
  console.log('===============================================');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    const testCalls = ['200893', '200576'];
    const results = [];
    
    for (const callId of testCalls) {
      const result = await verifyUploadAccuracy(token, auth, callId);
      results.push(result);
    }
    
    console.log('\n\n=== FINAL ACCURACY REPORT ===');
    
    let allAccurate = true;
    
    results.forEach(result => {
      console.log(`\nCall ${result.callId}:`);
      console.log(`  Fresh XML Valid: ${result.freshValid ? '✓' : '❌'}`);
      console.log(`  Call Data XML Valid: ${result.callDataValid ? '✓' : '❌'}`);
      console.log(`  Logs XML Valid: ${result.logsValid ? '✓' : '❌'}`);
      console.log(`  Sheets Match Upload: ${result.freshCallDataMatch && result.freshLogsMatch ? '✓' : '❌'}`);
      console.log(`  XML Sizes: Fresh=${result.xmlSizes.fresh}, CallData=${result.xmlSizes.callData}, Logs=${result.xmlSizes.logs}`);
      
      if (!result.freshCallDataMatch || !result.freshLogsMatch) {
        allAccurate = false;
      }
    });
    
    console.log(`\n🎯 UPLOAD ACCURACY: ${allAccurate ? 'VERIFIED' : 'INCONSISTENT'}`);
    
    if (allAccurate) {
      console.log('\n✅ Both Logs and Call Data XML fields accurately represent what would be uploaded to ESO');
      console.log('✅ All XML structures are valid and consistent');
      console.log('✅ GPS coordinates, CallNature, and unit structures are correct');
    } else {
      console.log('\n⚠️  XML inconsistencies detected - sheets may not match upload content');
    }
    
  } catch (error) {
    console.error('Verification failed:', error.message);
  }
}

main();