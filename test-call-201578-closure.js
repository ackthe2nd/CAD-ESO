/**
 * Test Call 201578 Closure Detection
 * Check if this closed call is properly detected and processed
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
      Username: process.env.RESGRID_USER,
      Password: process.env.RESGRID_PASS
    });
    return response.data.Data;
  } catch (error) {
    console.error('Failed to get API token:', error.message);
    throw error;
  }
}

async function checkCall201578State() {
  console.log('CHECKING CALL 201578 STATE');
  console.log('='.repeat(26));
  
  try {
    const token = await getResgridToken();
    
    // Check if call appears in active calls
    const activeCalls = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const isInActiveList = activeCalls.data.Data.some(call => call.CallId === '201578');
    console.log(`Call 201578 in active calls list: ${isInActiveList ? 'YES' : 'NO'}`);
    
    // Get direct call data
    try {
      const callResponse = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCall', {
        headers: { Authorization: `Bearer ${token}` },
        params: { callId: '201578' }
      });
      
      const callData = callResponse.data.Data;
      console.log(`\nCall 201578 Direct Data:`);
      console.log(`  State: ${callData.State} (${callData.State === 0 ? 'Active' : callData.State === 1 ? 'Closed' : 'Unknown'})`);
      console.log(`  Name: ${callData.Name}`);
      console.log(`  LoggedOn: ${callData.LoggedOn}`);
      console.log(`  ClosedOn: ${callData.ClosedOn || 'Not set'}`);
      
      if (callData.State === 1 && !isInActiveList) {
        console.log(`\n⚠️  CLOSURE DETECTED: Call 201578 is closed but not processed by system`);
        return { callData, shouldProcess: true };
      } else if (callData.State === 1 && isInActiveList) {
        console.log(`\n❓ INCONSISTENT STATE: Call shows as closed but still in active list`);
        return { callData, shouldProcess: true };
      } else {
        console.log(`\n✓ Call state is consistent`);
        return { callData, shouldProcess: false };
      }
      
    } catch (error) {
      console.log(`Error getting call data: ${error.message}`);
      return { callData: null, shouldProcess: false };
    }
    
  } catch (error) {
    console.error('Failed to check call state:', error.message);
    return { callData: null, shouldProcess: false };
  }
}

async function checkGoogleSheetsForCall201578() {
  console.log('\nCHECKING GOOGLE SHEETS FOR CALL 201578');
  console.log('='.repeat(37));
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Get call data from sheets
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!A1:AK100'
    });
    
    const data = dataResponse.data.values || [];
    const headers = data[0] || [];
    
    // Find Call Closed Time column
    const callClosedTimeIndex = headers.findIndex(h => h === 'Call Closed Time');
    const callClosedIndex = headers.findIndex(h => h === 'Call Closed');
    
    console.log(`Call Closed Time column index: ${callClosedTimeIndex}`);
    console.log(`Call Closed column index: ${callClosedIndex}`);
    
    // Find call 201578 row
    let call201578Row = null;
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === '201578') { // Call ID is in column B (index 1)
        call201578Row = data[i];
        console.log(`\nFound Call 201578 in row ${i + 1}`);
        break;
      }
    }
    
    if (call201578Row) {
      const callClosedTime = call201578Row[callClosedTimeIndex] || '';
      const callClosed = call201578Row[callClosedIndex] || '';
      
      console.log(`Call Closed Time: "${callClosedTime}"`);
      console.log(`Call Closed: "${callClosed}"`);
      
      if (!callClosedTime || callClosedTime === '') {
        console.log(`\n❌ Call 201578 closure not detected in Google Sheets`);
        return { inSheets: true, hasClosureData: false };
      } else {
        console.log(`\n✓ Call 201578 closure already recorded in Google Sheets`);
        return { inSheets: true, hasClosureData: true };
      }
    } else {
      console.log(`\n❌ Call 201578 not found in Google Sheets`);
      return { inSheets: false, hasClosureData: false };
    }
    
  } catch (error) {
    console.error('Error checking Google Sheets:', error.message);
    return { inSheets: false, hasClosureData: false };
  }
}

async function processCall201578Closure() {
  console.log('\nPROCESSING CALL 201578 CLOSURE');
  console.log('='.repeat(30));
  
  try {
    const token = await getResgridToken();
    
    // Get call data
    const callResponse = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCall', {
      headers: { Authorization: `Bearer ${token}` },
      params: { callId: '201578' }
    });
    
    const callData = callResponse.data.Data;
    
    // Get extra data
    const extraResponse = await axios.get('https://api.resgrid.com/api/v4/Calls/GetExtraCallDataForCall', {
      headers: { Authorization: `Bearer ${token}` },
      params: { callId: '201578' }
    });
    
    const extraData = extraResponse.data;
    
    console.log('✓ Retrieved call and extra data');
    
    // Make test call to processing endpoint
    console.log('Making test call to process closure...');
    
    const testResponse = await axios.get(`http://localhost:5000/test/201578`);
    
    if (testResponse.data.success) {
      console.log('✅ Call 201578 closure processing completed successfully');
      return true;
    } else {
      console.log('❌ Call 201578 closure processing failed:', testResponse.data.error);
      return false;
    }
    
  } catch (error) {
    console.error('Error processing call closure:', error.message);
    return false;
  }
}

async function main() {
  console.log('TESTING CALL 201578 CLOSURE DETECTION\n');
  
  // Step 1: Check call state
  const { callData, shouldProcess } = await checkCall201578State();
  
  // Step 2: Check Google Sheets
  const { inSheets, hasClosureData } = await checkGoogleSheetsForCall201578();
  
  // Step 3: Process if needed
  if (shouldProcess && !hasClosureData) {
    console.log('\n🔧 PROCESSING CLOSURE FOR CALL 201578');
    const processed = await processCall201578Closure();
    
    if (processed) {
      console.log('\n✅ CLOSURE DETECTION TEST COMPLETED SUCCESSFULLY');
      console.log('Call 201578 has been processed and closure data added to Google Sheets');
    } else {
      console.log('\n❌ CLOSURE DETECTION TEST FAILED');
      console.log('Manual intervention required');
    }
  } else if (hasClosureData) {
    console.log('\n✅ CLOSURE ALREADY DETECTED');
    console.log('Call 201578 closure data is already in Google Sheets');
  } else {
    console.log('\n❓ NO ACTION NEEDED');
    console.log('Call 201578 does not require closure processing');
  }
}

main().catch(console.error);