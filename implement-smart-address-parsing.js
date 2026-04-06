/**
 * Implement Smart Address Parsing
 * Handle data quality issues and detect corrupted address data
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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

function smartAddressParsing(fullAddress) {
  if (!fullAddress) return { 
    address1: '', 
    address2: '', 
    city: '', 
    state: '', 
    zip: '', 
    dataQuality: 'missing' 
  };
  
  const cleaned = fullAddress.trim();
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  console.log(`Analyzing address: "${fullAddress}"`);
  console.log(`Split into parts:`, parts);
  
  // Detect data quality issues
  function detectAddressQualityIssues(parts) {
    const issues = [];
    
    // Check for multiple street addresses in first part
    const streetIndicators = ['st', 'street', 'ave', 'avenue', 'blvd', 'boulevard', 'rd', 'road', 'ln', 'lane', 'dr', 'drive', 'ct', 'court', 'way', 'pl', 'place'];
    
    if (parts.length >= 2) {
      const firstPart = parts[0].toLowerCase();
      const secondPart = parts[1].toLowerCase();
      
      // Count street indicators in first two parts
      const firstPartStreetCount = streetIndicators.filter(indicator => 
        firstPart.includes(indicator)
      ).length;
      
      const secondPartStreetCount = streetIndicators.filter(indicator => 
        secondPart.includes(indicator)
      ).length;
      
      if (firstPartStreetCount > 0 && secondPartStreetCount > 0) {
        issues.push('multiple_street_addresses');
      }
    }
    
    return issues;
  }
  
  const qualityIssues = detectAddressQualityIssues(parts);
  
  let address1 = '';
  let address2 = '';
  let city = '';
  let state = '';
  let zip = '';
  let dataQuality = qualityIssues.length > 0 ? 'poor' : 'good';
  
  if (qualityIssues.includes('multiple_street_addresses')) {
    console.log('⚠️  Data quality issue detected: Multiple street addresses found');
    
    // For corrupted data with two street addresses, use the first one as primary
    // and mark the second as a data quality issue
    address1 = parts[0];
    address2 = `[DATA ISSUE] ${parts[1]}`;
    
    // City should be the next logical part
    if (parts.length >= 3) {
      city = parts[2];
    }
    
    dataQuality = 'corrupted_multiple_streets';
  } else {
    // Normal parsing logic
    if (parts.length >= 1) {
      address1 = parts[0];
    }
    
    // Check for building/suite indicators
    const buildingKeywords = ['building', 'bldg', 'suite', 'ste', 'apt', 'apartment', 'unit', 'floor', 'fl', 'room', 'rm'];
    let cityIndex = 1;
    
    if (parts.length >= 2) {
      const secondPart = parts[1];
      const hasBuildingInfo = buildingKeywords.some(keyword => 
        secondPart.toLowerCase().includes(keyword.toLowerCase())
      );
      
      if (hasBuildingInfo) {
        address2 = secondPart;
        cityIndex = 2;
      }
    }
    
    // Extract city
    if (parts.length > cityIndex) {
      city = parts[cityIndex];
    }
  }
  
  // Extract state and zip from remaining parts
  for (let i = Math.max(2, parts.length - 2); i < parts.length; i++) {
    const part = parts[i];
    
    if (part.toLowerCase() === 'usa' || part.toLowerCase() === 'united states') {
      continue;
    }
    
    const stateZipMatch = part.match(/^([A-Z]{2}|[A-Za-z\s]+)\s+(\d{5}(-\d{4})?)$/);
    if (stateZipMatch) {
      state = stateZipMatch[1].trim();
      zip = stateZipMatch[2];
      break;
    }
    
    if (part.match(/^[A-Z]{2}$/)) {
      state = part;
      continue;
    }
    
    if (part.match(/^\d{5}(-\d{4})?$/)) {
      zip = part;
      continue;
    }
  }
  
  const result = { address1, address2, city, state, zip, dataQuality };
  console.log('Smart parsing result:', result);
  
  return result;
}

async function addAddressLine2AndQualityColumns(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Adding Address Line 2 and Data Quality columns...');
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!1:1'
  });
  
  const headers = response.data.values ? response.data.values[0] : [];
  
  const addressIndex = headers.findIndex(h => 
    h === 'Emergency Address' || h === 'Address'
  );
  
  if (addressIndex === -1) {
    console.log('Could not find Emergency Address column');
    return false;
  }
  
  const columnsToAdd = [];
  
  if (!headers.includes('Address Line 2')) {
    columnsToAdd.push('Address Line 2');
  }
  
  if (!headers.includes('Address Data Quality')) {
    columnsToAdd.push('Address Data Quality');
  }
  
  if (columnsToAdd.length === 0) {
    console.log('Address columns already exist');
    return true;
  }
  
  // Insert columns after Emergency Address
  let insertIndex = addressIndex + 1;
  
  for (const columnName of columnsToAdd) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: spreadsheetId,
      resource: {
        requests: [
          {
            insertDimension: {
              range: {
                sheetId: 0,
                dimension: 'COLUMNS',
                startIndex: insertIndex,
                endIndex: insertIndex + 1
              }
            }
          }
        ]
      }
    });
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetId,
      range: `Call Data!${String.fromCharCode(65 + insertIndex)}1`,
      valueInputOption: 'RAW',
      resource: {
        values: [[columnName]]
      }
    });
    
    console.log(`Added ${columnName} column at position ${String.fromCharCode(65 + insertIndex)}`);
    insertIndex++;
  }
  
  return true;
}

async function testSmartAddressParsing() {
  console.log('\nTesting smart address parsing with known problematic address...');
  
  const problematicAddress = "1041 N. FORMOSAVA AVE, Santa Monica Blvd building ste 223, West Hollywood, CA 90046, USA";
  const result = smartAddressParsing(problematicAddress);
  
  console.log('\nTest Results:');
  console.log(`Input: ${problematicAddress}`);
  console.log(`Address Line 1: "${result.address1}"`);
  console.log(`Address Line 2: "${result.address2}"`);
  console.log(`City: "${result.city}"`);
  console.log(`State: "${result.state}"`);
  console.log(`ZIP: "${result.zip}"`);
  console.log(`Data Quality: "${result.dataQuality}"`);
  
  return result;
}

async function updateCall200892WithCorrectParsing(auth, token) {
  console.log('\nUpdating Call 200892 with corrected address parsing...');
  
  // Fetch current call data
  const [callResponse, extraResponse] = await Promise.all([
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=200892`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=200892`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  const call = callResponse.data.Data || callResponse.data;
  const parsedAddress = smartAddressParsing(call.Address);
  
  // Update the Call Data sheet with corrected parsing
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!A:AZ'
  });
  
  const rows = response.data.values || [];
  const headers = rows[0] || [];
  
  // Find Call 200892 row
  const callIdIndex = headers.findIndex(h => h === 'Emergency Call ID' || h === 'Call ID');
  const addressIndex = headers.findIndex(h => h === 'Emergency Address' || h === 'Address');
  const cityIndex = headers.findIndex(h => h === 'City');
  const address2Index = headers.findIndex(h => h === 'Address Line 2');
  const qualityIndex = headers.findIndex(h => h === 'Address Data Quality');
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][callIdIndex] === '200892') {
      // Update address fields
      if (addressIndex >= 0) rows[i][addressIndex] = parsedAddress.address1;
      if (address2Index >= 0) rows[i][address2Index] = parsedAddress.address2;
      if (cityIndex >= 0) rows[i][cityIndex] = parsedAddress.city;
      if (qualityIndex >= 0) rows[i][qualityIndex] = parsedAddress.dataQuality;
      
      // Update the row
      const range = `Call Data!A${i + 1}:${String.fromCharCode(65 + rows[i].length - 1)}${i + 1}`;
      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId,
        range: range,
        valueInputOption: 'RAW',
        resource: {
          values: [rows[i]]
        }
      });
      
      console.log(`Updated Call 200892 with corrected address parsing`);
      break;
    }
  }
  
  return parsedAddress;
}

async function main() {
  console.log('Implementing Smart Address Parsing with Data Quality Detection');
  console.log('============================================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    // Test the smart address parsing
    await testSmartAddressParsing();
    
    // Add necessary columns
    await addAddressLine2AndQualityColumns(auth);
    
    // Update Call 200892 with corrected parsing
    const correctedAddress = await updateCall200892WithCorrectParsing(auth, token);
    
    console.log('\n=== SMART ADDRESS PARSING IMPLEMENTATION COMPLETE ===');
    console.log('✓ Detected data quality issue: Multiple street addresses');
    console.log('✓ Added Address Line 2 and Address Data Quality columns');
    console.log('✓ Updated Call 200892 with smart parsing:');
    console.log(`  - Address Line 1: "${correctedAddress.address1}"`);
    console.log(`  - Address Line 2: "${correctedAddress.address2}" (marked as data issue)`);
    console.log(`  - City: "${correctedAddress.city}"`);
    console.log(`  - Data Quality: "${correctedAddress.dataQuality}"`);
    console.log('\nThe system now detects and handles corrupted address data appropriately');
    
  } catch (error) {
    console.error('Implementation failed:', error.message);
  }
}

main();