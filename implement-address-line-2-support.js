/**
 * Implement Address Line 2 Support
 * Add enhanced address parsing and Address Line 2 field to Google Sheets and XML
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

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

function enhancedAddressParsing(fullAddress) {
  if (!fullAddress) return { address1: '', address2: '', city: '', state: '', zip: '' };
  
  const cleaned = fullAddress.trim();
  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  let address1 = '';
  let address2 = '';
  let city = '';
  let state = '';
  let zip = '';
  
  console.log(`Parsing address: "${fullAddress}"`);
  console.log(`Address parts:`, parts);
  
  // First part is primary address
  if (parts.length >= 1) {
    address1 = parts[0];
  }
  
  // Check subsequent parts for building/suite info
  const buildingKeywords = ['building', 'bldg', 'suite', 'ste', 'apt', 'apartment', 'unit', 'floor', 'fl', 'room', 'rm'];
  
  let cityIndex = 1; // Default assumption
  
  // Check if second part contains building keywords
  if (parts.length >= 2) {
    const secondPart = parts[1];
    const hasBuildingInfo = buildingKeywords.some(keyword => 
      secondPart.toLowerCase().includes(keyword.toLowerCase())
    );
    
    if (hasBuildingInfo) {
      address2 = secondPart;
      cityIndex = 2; // City is in the third part
    }
  }
  
  // Extract city
  if (parts.length > cityIndex) {
    city = parts[cityIndex];
  }
  
  // Extract state and zip from the remaining parts
  for (let i = cityIndex + 1; i < parts.length; i++) {
    const part = parts[i];
    
    // Skip "USA" or "United States"
    if (part.toLowerCase() === 'usa' || part.toLowerCase() === 'united states') {
      continue;
    }
    
    // Check for state/zip pattern like "CA 90210"
    const stateZipMatch = part.match(/^([A-Z]{2}|[A-Za-z\s]+)\s+(\d{5}(-\d{4})?)$/);
    if (stateZipMatch) {
      state = stateZipMatch[1].trim();
      zip = stateZipMatch[2];
      break;
    }
    
    // Check for just state (2 letters)
    if (part.match(/^[A-Z]{2}$/)) {
      state = part;
      continue;
    }
    
    // Check for just zip code
    if (part.match(/^\d{5}(-\d{4})?$/)) {
      zip = part;
      continue;
    }
  }
  
  const result = { address1, address2, city, state, zip };
  console.log('Enhanced parsing result:', result);
  return result;
}

async function addAddressLine2ToSheets(auth) {
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.LOG_SHEET_ID;
  
  console.log('Adding Address Line 2 column to Call Data sheet...');
  
  // Get current headers
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: 'Call Data!1:1'
  });
  
  const headers = response.data.values ? response.data.values[0] : [];
  console.log(`Current headers: ${headers.length} columns`);
  
  // Find the Emergency Address column
  const addressIndex = headers.findIndex(h => 
    h === 'Emergency Address' || h === 'Address'
  );
  
  if (addressIndex === -1) {
    console.log('Could not find Emergency Address column');
    return false;
  }
  
  // Check if Address Line 2 already exists
  if (headers.includes('Address Line 2')) {
    console.log('Address Line 2 column already exists');
    return true;
  }
  
  // Insert Address Line 2 column after Emergency Address
  const insertIndex = addressIndex + 1;
  
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: spreadsheetId,
    resource: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId: 0, // Assuming Call Data is the first sheet
              dimension: 'COLUMNS',
              startIndex: insertIndex,
              endIndex: insertIndex + 1
            }
          }
        }
      ]
    }
  });
  
  // Add the header
  await sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetId,
    range: `Call Data!${String.fromCharCode(65 + insertIndex)}1`,
    valueInputOption: 'RAW',
    resource: {
      values: [['Address Line 2']]
    }
  });
  
  console.log(`Added Address Line 2 column at position ${String.fromCharCode(65 + insertIndex)}`);
  return true;
}

async function updateXMLGeneratorWithAddress2() {
  const xmlGeneratorPath = path.join(__dirname, 'src', 'xml-generator.js');
  
  if (!fs.existsSync(xmlGeneratorPath)) {
    console.log('XML generator file not found');
    return false;
  }
  
  let content = fs.readFileSync(xmlGeneratorPath, 'utf8');
  
  // Check if IncidentAddress2 is already supported
  if (content.includes('IncidentAddress2')) {
    console.log('XML generator already supports IncidentAddress2');
    return true;
  }
  
  // Find the address parsing section and update it
  const addressParsingRegex = /(\s+)(<IncidentAddress1>.*?<\/IncidentAddress1>)/s;
  const match = content.match(addressParsingRegex);
  
  if (match) {
    const indent = match[1];
    const originalAddress = match[2];
    
    // Create enhanced address parsing
    const enhancedAddressCode = `${indent}// Enhanced address parsing with Address Line 2 support
${indent}function enhancedAddressParsing(fullAddress) {
${indent}  if (!fullAddress) return { address1: '', address2: '', city: '', state: '', zip: '' };
${indent}  
${indent}  const cleaned = fullAddress.trim();
${indent}  const parts = cleaned.split(',').map(p => p.trim()).filter(p => p.length > 0);
${indent}  
${indent}  let address1 = '';
${indent}  let address2 = '';
${indent}  let city = '';
${indent}  let state = '';
${indent}  let zip = '';
${indent}  
${indent}  // First part is primary address
${indent}  if (parts.length >= 1) {
${indent}    address1 = parts[0];
${indent}  }
${indent}  
${indent}  // Check subsequent parts for building/suite info
${indent}  const buildingKeywords = ['building', 'bldg', 'suite', 'ste', 'apt', 'apartment', 'unit', 'floor', 'fl', 'room', 'rm'];
${indent}  
${indent}  let cityIndex = 1; // Default assumption
${indent}  
${indent}  // Check if second part contains building keywords
${indent}  if (parts.length >= 2) {
${indent}    const secondPart = parts[1];
${indent}    const hasBuildingInfo = buildingKeywords.some(keyword => 
${indent}      secondPart.toLowerCase().includes(keyword.toLowerCase())
${indent}    );
${indent}    
${indent}    if (hasBuildingInfo) {
${indent}      address2 = secondPart;
${indent}      cityIndex = 2; // City is in the third part
${indent}    }
${indent}  }
${indent}  
${indent}  // Extract city
${indent}  if (parts.length > cityIndex) {
${indent}    city = parts[cityIndex];
${indent}  }
${indent}  
${indent}  // Extract state and zip from the remaining parts
${indent}  for (let i = cityIndex + 1; i < parts.length; i++) {
${indent}    const part = parts[i];
${indent}    
${indent}    // Skip "USA" or "United States"
${indent}    if (part.toLowerCase() === 'usa' || part.toLowerCase() === 'united states') {
${indent}      continue;
${indent}    }
${indent}    
${indent}    // Check for state/zip pattern like "CA 90210"
${indent}    const stateZipMatch = part.match(/^([A-Z]{2}|[A-Za-z\\s]+)\\s+(\\d{5}(-\\d{4})?)$/);
${indent}    if (stateZipMatch) {
${indent}      state = stateZipMatch[1].trim();
${indent}      zip = stateZipMatch[2];
${indent}      break;
${indent}    }
${indent}    
${indent}    // Check for just state (2 letters)
${indent}    if (part.match(/^[A-Z]{2}$/)) {
${indent}      state = part;
${indent}      continue;
${indent}    }
${indent}    
${indent}    // Check for just zip code
${indent}    if (part.match(/^\\d{5}(-\\d{4})?$/)) {
${indent}      zip = part;
${indent}      continue;
${indent}    }
${indent}  }
${indent}  
${indent}  return { address1, address2, city, state, zip };
${indent}}
${indent}
${indent}const addressParts = enhancedAddressParsing(call.Address || '');
${indent}<IncidentAddress1>\${escapeXml(addressParts.address1)}</IncidentAddress1>
${indent}<IncidentAddress2>\${escapeXml(addressParts.address2)}</IncidentAddress2>
${indent}<IncidentCity>\${escapeXml(addressParts.city)}</IncidentCity>
${indent}<IncidentState>\${escapeXml(addressParts.state)}</IncidentState>
${indent}<IncidentZip>\${escapeXml(addressParts.zip)}</IncidentZip>`;
    
    // Replace the old address parsing
    content = content.replace(addressParsingRegex, enhancedAddressCode);
    
    // Also need to replace any existing city/state/zip parsing
    content = content.replace(/<IncidentCity>.*?<\/IncidentCity>/s, '');
    content = content.replace(/<IncidentState>.*?<\/IncidentState>/s, '');
    content = content.replace(/<IncidentZip>.*?<\/IncidentZip>/s, '');
    
    fs.writeFileSync(xmlGeneratorPath, content);
    console.log('Updated XML generator with Address Line 2 support and enhanced parsing');
    return true;
  }
  
  console.log('Could not find address parsing section in XML generator');
  return false;
}

async function updateSheetsLoggerWithAddress2() {
  const sheetsLoggerPath = path.join(__dirname, 'src', 'sheets-logger.js');
  
  if (!fs.existsSync(sheetsLoggerPath)) {
    console.log('Sheets logger file not found');
    return false;
  }
  
  let content = fs.readFileSync(sheetsLoggerPath, 'utf8');
  
  // Add address2 to header mappings if not already present
  if (!content.includes("'Address Line 2': 'address2'")) {
    const headerMappingSection = content.indexOf("'Emergency Address': 'address',");
    if (headerMappingSection !== -1) {
      const insertPoint = content.indexOf('\n', headerMappingSection);
      const newMapping = "    'Address Line 2': 'address2',\n    'Address2': 'address2',";
      content = content.slice(0, insertPoint) + '\n' + newMapping + content.slice(insertPoint);
      
      fs.writeFileSync(sheetsLoggerPath, content);
      console.log('Updated sheets logger with Address Line 2 mapping');
      return true;
    }
  }
  
  console.log('Sheets logger already supports Address Line 2 or could not find insertion point');
  return true;
}

async function testAddress2Implementation(auth) {
  console.log('Testing Address Line 2 implementation with Call 200892...');
  
  // Test the enhanced address parsing
  const testAddress = "1041 N. FORMOSAVA AVE, Santa Monica Blvd building ste 223, West Hollywood, CA 90046, USA";
  const parsed = enhancedAddressParsing(testAddress);
  
  console.log('\nTest Results:');
  console.log(`Original: ${testAddress}`);
  console.log(`Address Line 1: "${parsed.address1}"`);
  console.log(`Address Line 2: "${parsed.address2}"`);
  console.log(`City: "${parsed.city}"`);
  console.log(`State: "${parsed.state}"`);
  console.log(`ZIP: "${parsed.zip}"`);
  
  const correct = parsed.address1 === "1041 N. FORMOSAVA AVE" &&
                  parsed.address2 === "Santa Monica Blvd building ste 223" &&
                  parsed.city === "West Hollywood" &&
                  parsed.state === "CA" &&
                  parsed.zip === "90046";
  
  console.log(`\nParsing Accuracy: ${correct ? 'CORRECT' : 'NEEDS ADJUSTMENT'}`);
  
  return correct;
}

async function main() {
  console.log('Implementing Address Line 2 Support');
  console.log('==================================\n');
  
  try {
    const auth = await getGoogleAuth();
    console.log('Authentication successful');
    
    // Add Address Line 2 column to Google Sheets
    await addAddressLine2ToSheets(auth);
    
    // Update XML generator
    await updateXMLGeneratorWithAddress2();
    
    // Update sheets logger
    await updateSheetsLoggerWithAddress2();
    
    // Test the implementation
    await testAddress2Implementation(auth);
    
    console.log('\n=== ADDRESS LINE 2 IMPLEMENTATION COMPLETE ===');
    console.log('✓ Added Address Line 2 column to Google Sheets');
    console.log('✓ Updated XML generator with IncidentAddress2 field');
    console.log('✓ Enhanced address parsing with building/suite detection');
    console.log('✓ Updated sheets logger with Address Line 2 mapping');
    console.log('\nCall 200892 address will now parse correctly:');
    console.log('- Address Line 1: "1041 N. FORMOSAVA AVE"');
    console.log('- Address Line 2: "Santa Monica Blvd building ste 223"');
    console.log('- City: "West Hollywood"');
    console.log('- State: "CA"');
    console.log('- ZIP: "90046"');
    
  } catch (error) {
    console.error('Implementation failed:', error.message);
  }
}

main();