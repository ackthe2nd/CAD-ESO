/**
 * Check Call 201579 Closure Status
 * Verify the actual state and closure detection for this call
 */
require('dotenv').config();
const axios = require('axios');

async function getResgridToken() {
  const response = await axios({
    method: 'POST',
    url: 'https://api.resgrid.com/api/v4/Security/Token',
    data: {
      Username: process.env.RESGRID_USER,
      Password: process.env.RESGRID_PASS
    },
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.Tk;
}

async function checkCallClosure() {
  console.log('=== CALL 201579 CLOSURE ANALYSIS ===\n');
  
  try {
    const token = await getResgridToken();
    console.log('✅ Obtained Resgrid API token');
    
    // Check if call is in active calls
    console.log('\n--- Checking Active Calls ---');
    const activeResponse = await axios({
      method: 'GET',
      url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const activeCalls = activeResponse.data.Data || [];
    const isActive = activeCalls.some(call => call.CallId == 201579);
    console.log(`Call 201579 in active calls: ${isActive ? 'YES' : 'NO'}`);
    console.log(`Total active calls: ${activeCalls.length}`);
    
    // Get call details
    console.log('\n--- Call Details ---');
    const callResponse = await axios({
      method: 'GET',
      url: `https://api.resgrid.com/api/v4/Calls/GetCall?callId=201579`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const callData = callResponse.data.Data;
    if (callData) {
      console.log(`Call ID: ${callData.CallId}`);
      console.log(`Call Number: ${callData.Number}`);
      console.log(`State: ${callData.State} (${callData.State === 0 ? 'Active' : callData.State === 1 ? 'Closed' : 'Unknown'})`);
      console.log(`Closed By User ID: ${callData.ClosedByUserId || 'Not set'}`);
      console.log(`Closed On: ${callData.ClosedOn || 'Not set'}`);
      console.log(`Is Deleted: ${callData.IsDeleted}`);
      
      // Check recent calls to see if 201579 was recently active
      console.log('\n--- Recent Calls Check ---');
      const recentResponse = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetRecentCalls?days=1',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const recentCalls = recentResponse.data.Data || [];
      const recentCall = recentCalls.find(call => call.CallId == 201579);
      
      if (recentCall) {
        console.log('✅ Found in recent calls:');
        console.log(`  State: ${recentCall.State} (${recentCall.State === 0 ? 'Active' : recentCall.State === 1 ? 'Closed' : 'Unknown'})`);
        console.log(`  Logged On: ${recentCall.LoggedOn}`);
        console.log(`  Closed On: ${recentCall.ClosedOn || 'Not set'}`);
      } else {
        console.log('❌ Not found in recent calls (older than 1 day)');
      }
      
      // Analysis
      console.log('\n--- CLOSURE ANALYSIS ---');
      if (callData.State === 1) {
        console.log('✅ Call is currently CLOSED');
        if (callData.ClosedOn) {
          console.log(`✅ Closure timestamp available: ${callData.ClosedOn}`);
        } else {
          console.log('⚠️  No closure timestamp recorded');
        }
      } else if (callData.State === 0) {
        console.log('❌ Call is still ACTIVE - not closed yet');
      }
      
      console.log('\n--- SYSTEM BEHAVIOR EXPLANATION ---');
      console.log('The system detects closures in two ways:');
      console.log('1. Real-time: When a call transitions from Active (0) to Closed (1) during monitoring');
      console.log('2. Polling: When a previously active call is no longer in the active calls list');
      console.log('');
      console.log('For call 201579:');
      if (callData.State === 1 && !isActive) {
        console.log('- Call is already closed and not in active list');
        console.log('- No state transition occurred during our monitoring session');
        console.log('- This is expected behavior for pre-closed calls');
      } else if (callData.State === 0 && isActive) {
        console.log('- Call is still active and being monitored');
        console.log('- Closure detection will trigger when it closes');
      }
      
    } else {
      console.log('❌ Call 201579 not found or access denied');
    }
    
  } catch (error) {
    console.error('Error checking call closure:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

checkCallClosure();