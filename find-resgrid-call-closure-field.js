/**
 * Find Resgrid Call Closure Field
 * 
 * This script examines different call states and structures to find
 * the actual field that represents when a call is closed out in Resgrid.
 */

require('dotenv').config();

async function getResgridToken() {
  const axios = require('axios');
  
  const response = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
    Username: process.env.RESGRID_USER,
    Password: process.env.RESGRID_PASS
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.Tkn;
}

async function findCallClosureField() {
  console.log('Finding Resgrid Call Closure Field');
  console.log('==================================');
  
  try {
    const token = await getResgridToken();
    if (!token) {
      console.error('Failed to get Resgrid API token');
      return;
    }
    
    // Try different approaches to find calls with different states
    console.log('Testing various API endpoints to find calls with closure data...');
    
    // Test 1: Try GetActiveCalls and examine structure
    console.log('\n1. Examining GetActiveCalls structure...');
    try {
      const activeResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetActiveCalls`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        const calls = activeData.Data || [];
        
        console.log(`Found ${calls.length} active calls`);
        
        if (calls.length > 0) {
          const sampleCall = calls[0];
          console.log('\nSample active call structure:');
          console.log('Fields that might indicate closure:');
          
          Object.keys(sampleCall).forEach(key => {
            const value = sampleCall[key];
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('close') || lowerKey.includes('end') || 
                lowerKey.includes('complete') || lowerKey.includes('state') ||
                lowerKey.includes('status') || lowerKey.includes('finish')) {
              console.log(`  ${key}: ${value}`);
            }
          });
        }
      } else {
        console.log(`GetActiveCalls failed: ${activeResponse.status}`);
      }
    } catch (error) {
      console.log(`Error with GetActiveCalls: ${error.message}`);
    }
    
    // Test 2: Try a different date range approach for GetCalls
    console.log('\n2. Trying alternative GetCalls with shorter date range...');
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const today = new Date();
      
      // Try without URL encoding first
      const callsUrl = `https://api.resgrid.com/api/v4/Calls/GetCalls?startDate=${yesterday.toISOString()}&endDate=${today.toISOString()}`;
      console.log('Trying URL:', callsUrl);
      
      const callsResponse = await fetch(callsUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`GetCalls response status: ${callsResponse.status}`);
      
      if (callsResponse.ok) {
        const callsData = await callsResponse.json();
        console.log('GetCalls response structure:', Object.keys(callsData));
        
        if (callsData.Data && callsData.Data.length > 0) {
          console.log(`Found ${callsData.Data.length} calls from last 24 hours`);
          
          // Look for calls with different states
          const callsByState = {};
          callsData.Data.forEach(call => {
            const state = call.State || 'Unknown';
            if (!callsByState[state]) callsByState[state] = [];
            callsByState[state].push(call);
          });
          
          console.log('\nCalls by state:');
          Object.keys(callsByState).forEach(state => {
            console.log(`  ${state}: ${callsByState[state].length} calls`);
          });
          
          // Examine a call from each state
          Object.keys(callsByState).forEach(state => {
            const call = callsByState[state][0];
            console.log(`\nSample ${state} call (${call.CallId}):`);
            
            Object.keys(call).forEach(key => {
              const value = call[key];
              const lowerKey = key.toLowerCase();
              
              if (lowerKey.includes('close') || lowerKey.includes('end') || 
                  lowerKey.includes('complete') || lowerKey.includes('state') ||
                  lowerKey.includes('finish') || value === state) {
                console.log(`  ${key}: ${value}`);
              }
            });
          });
        }
      }
    } catch (error) {
      console.log(`Error with GetCalls: ${error.message}`);
    }
    
    // Test 3: Try GetCall on the known call 201108 which shows closure time in sheets
    console.log('\n3. Examining known call 201108 which has closure time in Google Sheets...');
    try {
      const callResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=201108`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (callResponse.ok) {
        const callData = await callResponse.json();
        const call = callData.Data;
        
        console.log('Call 201108 structure (should have closure data):');
        console.log('All fields:');
        
        Object.keys(call).forEach(key => {
          const value = call[key];
          console.log(`  ${key}: ${value}`);
        });
        
        console.log('\nFields potentially related to closure:');
        Object.keys(call).forEach(key => {
          const value = call[key];
          const lowerKey = key.toLowerCase();
          
          if (value && value !== '' && value !== '0001-01-01T00:00:00' &&
              (lowerKey.includes('close') || lowerKey.includes('end') || 
               lowerKey.includes('complete') || lowerKey.includes('finish') ||
               lowerKey.includes('state'))) {
            console.log(`  ${key}: ${value}`);
          }
        });
      } else {
        console.log(`GetCall for 201108 failed: ${callResponse.status}`);
      }
    } catch (error) {
      console.log(`Error with GetCall 201108: ${error.message}`);
    }
    
    // Test 4: Check if there are other call endpoints
    console.log('\n4. Testing alternative endpoints...');
    const alternativeEndpoints = [
      'Calls/GetClosedCalls',
      'Calls/GetCompletedCalls', 
      'Calls/GetCallHistory',
      'Calls/GetAllCalls'
    ];
    
    for (const endpoint of alternativeEndpoints) {
      try {
        const response = await fetch(`https://api.resgrid.com/api/v4/${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`${endpoint}: Status ${response.status}`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`  Response keys: ${Object.keys(data)}`);
          if (data.Data && Array.isArray(data.Data)) {
            console.log(`  Found ${data.Data.length} items`);
          }
        }
      } catch (error) {
        console.log(`${endpoint}: Error - ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error finding call closure field:', error.message);
  }
}

// Run the search
findCallClosureField();