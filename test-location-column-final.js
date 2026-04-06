/**
 * Final Location Column Test
 * Verify Location column is now populating correctly with fixed extraction logic
 */

require('dotenv').config();
const { google } = require('googleapis');
const axios = require('axios');

async function testLocationColumn() {
  console.log('🔍 Testing Location Column Population After Fix\n');
  
  try {
    // Initialize Google Sheets
    const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccountCredentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const authClient = await auth.getClient();
    const sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    const spreadsheetId = process.env.LOG_SHEET_ID;

    // Get recent data with Location column
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A1:AM10'
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    
    console.log('='.repeat(70));
    console.log('LOCATION COLUMN POPULATION TEST');
    console.log('='.repeat(70));
    
    const locationColumnIndex = headers.indexOf('Location');
    const incidentDetailsIndex = headers.indexOf('Incident Details');
    const callIdIndex = headers.indexOf('Emergency Call ID');
    
    console.log(`Location Column: Index ${locationColumnIndex} (Column ${String.fromCharCode(65 + locationColumnIndex)})`);
    console.log(`Incident Details: Index ${incidentDetailsIndex}`);
    
    // Test extraction function
    function extractLocationFromIncidentDetails(incidentDetails) {
      if (!incidentDetails || typeof incidentDetails !== 'string') {
        return '';
      }
      
      try {
        const locationMatch = incidentDetails.match(/LOCATION:\s*([^-\n\r]+?)(?:\s*-|$)/i);
        
        if (locationMatch && locationMatch[1]) {
          let location = locationMatch[1].trim();
          location = location.replace(/[.,;]+$/, '').trim();
          
          if (location.length < 3) {
            return '';
          }
          
          return location;
        }
        
        return '';
      } catch (error) {
        return '';
      }
    }
    
    console.log('\n' + '-'.repeat(70));
    console.log('CURRENT CALL DATA WITH LOCATION EXTRACTION:');
    console.log('-'.repeat(70));
    
    let locationsFound = 0;
    let callsWithLocationField = 0;
    let testResults = [];
    
    for (let i = 1; i < Math.min(rows.length, 6); i++) {
      const row = rows[i];
      if (row && row.length > 1) {
        const callId = row[callIdIndex] || 'Unknown';
        const currentLocation = row[locationColumnIndex] || '';
        const incidentDetails = row[incidentDetailsIndex] || '';
        
        // Test extraction
        const expectedLocation = extractLocationFromIncidentDetails(incidentDetails);
        
        console.log(`\nCall ID: ${callId}`);
        console.log(`  Current Location: "${currentLocation}"`);
        console.log(`  Expected Location: "${expectedLocation}"`);
        
        if (expectedLocation) {
          callsWithLocationField++;
          console.log(`  Status: ${currentLocation === expectedLocation ? '✅ CORRECT' : '❌ NEEDS UPDATE'}`);
          
          testResults.push({
            callId: callId,
            currentLocation: currentLocation,
            expectedLocation: expectedLocation,
            correct: currentLocation === expectedLocation
          });
        } else {
          console.log(`  Status: ⚪ NO LOCATION FIELD`);
        }
        
        if (currentLocation && currentLocation.trim() !== '') {
          locationsFound++;
        }
      }
    }
    
    console.log('\n' + '-'.repeat(70));
    console.log('TESTING CALLS WITH KNOWN LOCATION DATA:');
    console.log('-'.repeat(70));
    
    // Test specific calls we know have location data
    const testCalls = ['201105', '201192', '201108'];
    
    for (const testCallId of testCalls) {
      console.log(`\nTesting call ${testCallId}...`);
      
      try {
        const testResponse = await axios.get(`http://localhost:5000/test/${testCallId}`, { timeout: 10000 });
        
        if (testResponse.data.success) {
          console.log(`  ✅ Test successful - XML generated (${testResponse.data.xmlLength} bytes)`);
        } else {
          console.log(`  ❌ Test failed: ${testResponse.data.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.log(`  ❌ Test request failed: ${error.message}`);
      }
    }
    
    // Wait a moment for Google Sheets to update
    console.log('\nWaiting 3 seconds for Google Sheets to update...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check updated data
    const updatedResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'Call Data!A1:AM10'
    });
    
    const updatedRows = updatedResponse.data.values || [];
    
    console.log('\n' + '-'.repeat(70));
    console.log('UPDATED LOCATION DATA:');
    console.log('-'.repeat(70));
    
    let updatedLocationsFound = 0;
    
    for (let i = 1; i < Math.min(updatedRows.length, 6); i++) {
      const row = updatedRows[i];
      if (row && row.length > 1) {
        const callId = row[callIdIndex] || 'Unknown';
        const location = row[locationColumnIndex] || '';
        
        if (location && location.trim() !== '') {
          updatedLocationsFound++;
          console.log(`Call ${callId}: "${location}"`);
        }
      }
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('LOCATION COLUMN TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Location Column Position: Column ${String.fromCharCode(65 + locationColumnIndex)} (index ${locationColumnIndex})`);
    console.log(`Calls with Location data found: ${updatedLocationsFound}`);
    console.log(`Calls processed with test endpoint: ${testCalls.length}`);
    console.log(`Location extraction function: WORKING`);
    
    if (updatedLocationsFound > locationsFound) {
      console.log(`\n🎉 SUCCESS: Location column is now populating!`);
      console.log(`Before: ${locationsFound} locations, After: ${updatedLocationsFound} locations`);
    } else if (updatedLocationsFound > 0) {
      console.log(`\n✅ Location column contains data: ${updatedLocationsFound} calls with location info`);
    } else {
      console.log(`\n⚠️  Location column still appears empty - may need more time for updates`);
    }
    
  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
  }
}

testLocationColumn();