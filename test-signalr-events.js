/**
 * Test SignalR Event Detection
 * Check if CallClosed events are being received and processed
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

async function testSignalREventDetection() {
  console.log('TESTING SIGNALR EVENT DETECTION');
  console.log('='.repeat(32));
  
  try {
    const token = await getResgridToken();
    console.log('✓ Successfully obtained API token');
    
    // Check recent calls for state changes
    console.log('\nChecking recent calls for closure patterns...');
    
    const activeCalls = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    console.log(`Found ${activeCalls.data.Data.length} active calls`);
    
    // Check a recent call that might have been closed
    const recentCallIds = ['201576', '201575', '201573', '201572'];
    
    for (const callId of recentCallIds) {
      try {
        const callResponse = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCall', {
          headers: { Authorization: `Bearer ${token}` },
          params: { callId }
        });
        
        const callData = callResponse.data.Data;
        console.log(`\nCall ${callId}:`);
        console.log(`  State: ${callData.State} (${callData.State === 0 ? 'Active' : callData.State === 1 ? 'Closed' : 'Unknown'})`);
        console.log(`  LoggedOn: ${callData.LoggedOn}`);
        console.log(`  Name: ${callData.Name}`);
        
        // Check if this call appears in active calls
        const isActive = activeCalls.data.Data.some(ac => ac.CallId === callId);
        console.log(`  In Active Calls: ${isActive ? 'Yes' : 'No'}`);
        
        if (callData.State === 1 && !isActive) {
          console.log(`  ⚠️  Call ${callId} is closed but SignalR events may not have fired`);
        }
        
      } catch (error) {
        console.log(`Call ${callId}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function checkGoogleSheetsLogs() {
  console.log('\nCHECKING GOOGLE SHEETS FOR SIGNALR EVENTS');
  console.log('='.repeat(40));
  
  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Check recent logs for SignalR events
    const logsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Logs!A1:E50'
    });
    
    const logs = logsResponse.data.values || [];
    
    console.log('Searching for SignalR events in recent logs...');
    
    let signalREvents = 0;
    let callClosedEvents = 0;
    
    logs.forEach((row, index) => {
      if (row.length >= 3) {
        const message = row[2] || '';
        
        if (message.includes('RECEIVED CALL EVENT')) {
          signalREvents++;
          console.log(`Row ${index + 1}: ${message}`);
          
          if (message.includes('CallClosed')) {
            callClosedEvents++;
          }
        }
      }
    });
    
    console.log(`\nSummary:`);
    console.log(`Total SignalR events found: ${signalREvents}`);
    console.log(`CallClosed events found: ${callClosedEvents}`);
    
    if (callClosedEvents === 0) {
      console.log('❌ No CallClosed events detected in logs');
      console.log('This suggests SignalR CallClosed events are not being received');
    } else {
      console.log('✓ CallClosed events are being received');
    }
    
  } catch (error) {
    console.error('Error checking sheets logs:', error.message);
  }
}

async function testManualCallClosure() {
  console.log('\nTESTING MANUAL CALL CLOSURE DETECTION');
  console.log('='.repeat(38));
  
  console.log('Instructions for manual testing:');
  console.log('1. Close call 201576 in your Resgrid dispatch system');
  console.log('2. Watch the system logs for these messages:');
  console.log('   - "⚠️ RECEIVED CALL EVENT: CallClosed for call ID: 201576"');
  console.log('   - "Call 201576 detected as closed (State: 1)"');
  console.log('   - "Updated existing call 201576 in Google Sheets"');
  console.log('3. Check Google Sheets Call Closed field for timestamp');
  
  console.log('\nIf no SignalR events appear, the issue is:');
  console.log('- SignalR connection not receiving CallClosed events from Resgrid');
  console.log('- Resgrid may not be sending CallClosed events for your account');
  console.log('- Event filtering or connection issues');
}

async function identifyClosureDetectionMethod() {
  console.log('\nIDENTIFYING CLOSURE DETECTION METHOD');
  console.log('='.repeat(36));
  
  console.log('Current system has multiple closure detection methods:');
  console.log('1. SignalR CallClosed events (real-time)');
  console.log('2. SignalR CallStateChanged events (real-time)');
  console.log('3. Polling for calls no longer active (backup, 60-second intervals)');
  
  console.log('\nThe polling method should catch closures even if SignalR fails.');
  console.log('However, it only triggers every 60 seconds and may miss quick changes.');
  
  console.log('\nRecommendation:');
  console.log('- Enhance polling frequency for closure detection');
  console.log('- Add direct State checking in polling logic');
  console.log('- Implement immediate closure processing when State changes to 1');
}

async function main() {
  await testSignalREventDetection();
  await checkGoogleSheetsLogs();
  testManualCallClosure();
  identifyClosureDetectionMethod();
}

main().catch(console.error);