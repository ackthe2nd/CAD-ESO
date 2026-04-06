/**
 * Simple Call Test - Using Google Sheets Data
 * Tests call processing using data already in Google Sheets without making additional API calls
 */

require('dotenv').config();
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator.js');

async function testCallFromSheets(callId) {
  console.log(`\n=== TESTING CALL ${callId} FROM SHEETS DATA ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  try {
    // Initialize Google Sheets
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    if (!serviceAccountJson) {
      throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not set');
    }

    const credentials = JSON.parse(serviceAccountJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheetsClient = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get call data from Google Sheets
    console.log('Fetching call data from Google Sheets...');
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: 'Call Data!A:AJ',
    });

    const allData = response.data.values || [];
    const headers = allData[0] || [];
    
    // Find the call row
    const callIdIndex = headers.findIndex(h => h.toLowerCase().includes('emergency call id'));
    if (callIdIndex === -1) {
      throw new Error('Emergency Call ID column not found');
    }

    const callRow = allData.find(row => row[callIdIndex] === callId);
    if (!callRow) {
      throw new Error(`Call ${callId} not found in Google Sheets`);
    }

    console.log('✅ Found call data in Google Sheets');

    // Map sheet data to call structure
    const callData = {};
    headers.forEach((header, index) => {
      const value = callRow[index] || '';
      
      // Map common sheet headers to API field names
      switch (header.toLowerCase()) {
        case 'emergency call id':
          callData.CallId = value;
          break;
        case 'call title':
          callData.Name = value;
          break;
        case 'incident type':
          callData.Nature = value;
          break;
        case 'incident details':
          callData.Note = value;
          break;
        case 'emergency address':
          callData.Address = value;
          break;
        case 'priority description':
          callData.Priority = value;
          break;
        case 'call received time':
          callData.LoggedOn = value;
          break;
        case 'gps latitude':
          if (value) callData.Latitude = parseFloat(value);
          break;
        case 'gps longitude':
          if (value) callData.Longitude = parseFloat(value);
          break;
        case 'call closed':
          callData.State = value === 'TRUE' || value === '1' ? 1 : 0;
          break;
        case 'call closed time':
          if (value) callData.ClosedOn = value;
          break;
      }
    });

    // Create mock extra data structure
    const extraData = {
      Data: {
        Dispatches: [],
        Activity: []
      }
    };

    // Parse responding units if available
    const respondingUnitsIndex = headers.findIndex(h => h.toLowerCase().includes('responding units'));
    if (respondingUnitsIndex !== -1 && callRow[respondingUnitsIndex]) {
      const units = callRow[respondingUnitsIndex].split(',').map(u => u.trim()).filter(u => u);
      units.forEach((unitName, index) => {
        extraData.Data.Dispatches.push({
          UnitId: 1000 + index,
          UnitName: unitName,
          Name: unitName
        });
      });
    }

    // Display call information
    console.log('\n--- CALL INFORMATION FROM SHEETS ---');
    console.log(`Call ID: ${callData.CallId}`);
    console.log(`Title: ${callData.Name || 'N/A'}`);
    console.log(`Nature: ${callData.Nature || 'N/A'}`);
    console.log(`State: ${callData.State} (${callData.State === 0 ? 'Active' : callData.State === 1 ? 'Closed' : 'Unknown'})`);
    console.log(`Address: ${callData.Address || 'N/A'}`);
    console.log(`Priority: ${callData.Priority || 'N/A'}`);
    console.log(`Logged On: ${callData.LoggedOn || 'N/A'}`);

    // Test XML generation
    console.log('\n--- TESTING XML GENERATION ---');
    const xml = await generateXML(callData, extraData, true);
    
    if (xml && xml.length > 0) {
      console.log(`✅ XML generated successfully (${xml.length} characters)`);
      
      // Validate XML structure
      const hasXmlDeclaration = xml.includes('<?xml');
      const hasCadIncident = xml.includes('<CadIncident');
      const hasCallId = xml.includes(callId);
      
      console.log(`✅ XML Declaration: ${hasXmlDeclaration}`);
      console.log(`✅ CadIncident Root: ${hasCadIncident}`);
      console.log(`✅ Contains Call ID: ${hasCallId}`);
      
      if (hasXmlDeclaration && hasCadIncident && hasCallId) {
        console.log('✅ XML structure validation passed');
      } else {
        console.log('❌ XML structure validation failed');
      }

      // Show XML preview
      console.log('\n--- XML PREVIEW ---');
      const xmlLines = xml.split('\n');
      const previewLines = xmlLines.slice(0, 10);
      previewLines.forEach(line => console.log(line));
      if (xmlLines.length > 10) {
        console.log(`... (${xmlLines.length - 10} more lines)`);
      }
    } else {
      console.log('❌ XML generation failed');
    }

    // Test unit information
    console.log('\n--- UNIT INFORMATION ---');
    if (extraData.Data.Dispatches.length > 0) {
      console.log(`✅ Found ${extraData.Data.Dispatches.length} units:`);
      extraData.Data.Dispatches.forEach((unit, index) => {
        console.log(`  Unit ${index + 1}: ${unit.UnitName} (ID: ${unit.UnitId})`);
      });
    } else {
      console.log('ℹ️ No units found in data');
    }

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    console.log(`Call ${callId} processed from Google Sheets data`);
    console.log(`XML generated: ${xml ? 'Yes' : 'No'}`);
    console.log(`Data source: Google Sheets`);
    
    return {
      success: true,
      callId: callId,
      callData: callData,
      extraData: extraData,
      xml: xml,
      xmlLength: xml ? xml.length : 0,
      source: 'Google Sheets'
    };

  } catch (error) {
    console.log('\n=== TEST FAILED ===');
    console.log(`Error testing call ${callId}: ${error.message}`);
    
    return {
      success: false,
      callId: callId,
      error: error.message,
      source: 'Google Sheets'
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node simple-call-test.js <callId>');
    console.log('Example: node simple-call-test.js 201192');
    process.exit(1);
  }

  // Extract call ID from arguments
  let callId = args[0];
  if (callId.startsWith('test-call-')) {
    callId = callId.replace('test-call-', '');
  }

  console.log('Simple Call Testing Tool');
  console.log('========================');
  console.log('Testing using Google Sheets data (no additional API calls)');
  
  const result = await testCallFromSheets(callId);
  
  if (result.success) {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  } else {
    console.log('\n❌ Test failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { testCallFromSheets };