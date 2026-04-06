/**
 * Test Complete Google Sheets Export with Real Call Data
 * Verifies all fields are properly extracted and exported
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

async function getResgridToken() {
  const tokenResponse = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  });
  
  return tokenResponse.data.Token;
}

async function getGoogleAuth() {
  const serviceAccountCredentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: serviceAccountCredentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  return auth;
}

async function fetchCallWithExtraData(token, callId) {
  const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall`, {
    params: { callId },
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
    params: { callId },
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  return {
    callData: callResponse.data,
    extraData: extraResponse.data
  };
}

async function testSheetsExportWithRealData() {
  console.log('Testing Complete Google Sheets Export');
  console.log('====================================\n');
  
  try {
    const token = await getResgridToken();
    const auth = await getGoogleAuth();
    
    // Test with an active call
    const callId = '200893';
    console.log(`Fetching real data for call ${callId}...`);
    
    const { callData, extraData } = await fetchCallWithExtraData(token, callId);
    
    console.log('\nCall Data Structure Analysis:');
    console.log('Call Data keys:', Object.keys(callData.Data || callData).slice(0, 10).join(', '));
    console.log('Extra Data keys:', Object.keys(extraData.Data || extraData).slice(0, 10).join(', '));
    
    // Test the sheets logging function
    const { sheetCallRow } = require('./src/sheets-logger');
    
    console.log('\nTesting Google Sheets export...');
    const uploadStatus = `Call ID ${callId} - Test Export`;
    const uploadUrl = `https://sftp.esosuite.net/test/${callId}.xml`;
    
    const result = await sheetCallRow(callData, extraData, uploadStatus, uploadUrl);
    
    if (result) {
      console.log('✅ Successfully exported to Google Sheets');
      
      // Verify what was actually written
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.LOG_SHEET_ID;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Call Data!A1:AJ10'
      });
      
      const rows = response.data.values || [];
      const headers = rows[0] || [];
      
      // Find the row for our test call
      let testRow = null;
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][1] === callId) { // Emergency Call ID column
          testRow = rows[i];
          break;
        }
      }
      
      if (testRow) {
        console.log('\nField Population Analysis:');
        console.log('=========================');
        
        const criticalFields = [
          { name: 'Call Received Time', index: 0 },
          { name: 'Emergency Call ID', index: 1 },
          { name: 'Call Title', index: 3 },
          { name: 'Incident Type', index: 4 },
          { name: 'Emergency Address', index: 5 },
          { name: 'GPS Latitude', index: 10 },
          { name: 'GPS Longitude', index: 11 },
          { name: 'Responding Units', index: 2 },
          { name: 'ESO Upload Status', index: 32 },
          { name: 'Generated XML', index: 30 }
        ];
        
        let populatedCount = 0;
        
        criticalFields.forEach(field => {
          const value = testRow[field.index] || '';
          const isPopulated = value.trim() !== '';
          const status = isPopulated ? '✅' : '❌';
          
          if (isPopulated) populatedCount++;
          
          console.log(`${status} ${field.name}: ${isPopulated ? value.substring(0, 40) + '...' : '(empty)'}`);
        });
        
        console.log(`\nCritical Field Coverage: ${populatedCount}/${criticalFields.length} (${((populatedCount/criticalFields.length)*100).toFixed(1)}%)`);
        
        // Check specific improvements
        const improvements = {
          'GPS Coordinates': testRow[10] && testRow[11],
          'Call Timestamp': testRow[0],
          'Upload Status': testRow[32] && testRow[32].includes('Test Export'),
          'XML Content': testRow[30] && testRow[30].includes('CadIncident')
        };
        
        console.log('\nImprovement Verification:');
        Object.entries(improvements).forEach(([feature, isFixed]) => {
          console.log(`${isFixed ? '✅' : '❌'} ${feature}: ${isFixed ? 'Working' : 'Needs fix'}`);
        });
        
      } else {
        console.log('❌ Test call not found in Google Sheets');
      }
      
    } else {
      console.log('❌ Failed to export to Google Sheets');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testSheetsExportWithRealData();