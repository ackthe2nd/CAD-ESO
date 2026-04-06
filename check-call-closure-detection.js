/**
 * Check Call Closure Detection
 * Verify if the system properly detects call closures and processes them
 */

require('dotenv').config();
const axios = require('axios');

async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Auth/Logon', {
      username: process.env.RESGRID_USER || 'EMSadmin',
      password: process.env.RESGRID_PASS || 'a1b2c3D*'
    });
    return response.data.AuthToken;
  } catch (error) {
    console.log('Error getting token:', error.message);
    return null;
  }
}

async function checkRecentCalls(token) {
  try {
    console.log('🔍 Checking recent calls (last 2 hours)...\n');
    
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (2 * 60 * 60 * 1000)); // 2 hours ago
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCallsForDate', {
      headers: { 'Authorization': `Bearer ${token}` },
      params: {
        date: startDate.toISOString().split('T')[0]
      }
    });
    
    const calls = response.data.Data || [];
    console.log(`Found ${calls.length} calls from today\n`);
    
    // Check recent calls for closure status
    const recentCalls = calls.filter(call => {
      const callTime = new Date(call.LoggedOnUtc);
      return callTime >= startDate;
    });
    
    console.log(`📋 Recent calls (last 2 hours): ${recentCalls.length}\n`);
    
    for (const call of recentCalls) {
      console.log(`Call ID: ${call.CallId}`);
      console.log(`Name: ${call.Name}`);
      console.log(`State: ${call.State}`);
      console.log(`Logged: ${call.LoggedOn}`);
      console.log(`Closed: ${call.ClosedOn || 'Not closed'}`);
      console.log('---');
    }
    
    return recentCalls;
  } catch (error) {
    console.log('Error fetching calls:', error.message);
    return [];
  }
}

async function checkActiveCalls(token) {
  try {
    console.log('\n🚨 Checking currently active calls...\n');
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const activeCalls = response.data.Data || [];
    console.log(`Found ${activeCalls.length} active calls\n`);
    
    for (const call of activeCalls) {
      console.log(`Active Call ID: ${call.CallId}`);
      console.log(`Name: ${call.Name}`);
      console.log(`State: ${call.State}`);
      console.log(`Logged: ${call.LoggedOn}`);
      console.log('---');
    }
    
    return activeCalls;
  } catch (error) {
    console.log('Error fetching active calls:', error.message);
    return [];
  }
}

async function main() {
  console.log('🔧 Call Closure Detection Check\n');
  
  const token = await getResgridToken();
  if (!token) {
    console.log('❌ Failed to get Resgrid token');
    return;
  }
  
  console.log('✅ Successfully obtained Resgrid token\n');
  
  const recentCalls = await checkRecentCalls(token);
  const activeCalls = await checkActiveCalls(token);
  
  console.log('\n📊 Analysis:');
  console.log('1. SignalR should detect call closure events instantly');
  console.log('2. Polling backup checks every 60 seconds');
  console.log('3. System should process closed calls and update XML');
  console.log('4. Check if call state changed from active to closed');
  
  const closedRecentCalls = recentCalls.filter(call => call.ClosedOn);
  if (closedRecentCalls.length > 0) {
    console.log(`\n✅ Found ${closedRecentCalls.length} recently closed calls`);
    console.log('The system should have processed these closures');
  } else {
    console.log('\n❓ No recently closed calls found');
    console.log('Call may still be active or closure not yet detected');
  }
}

main().catch(console.error);