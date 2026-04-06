/**
 * Analyze Current Call Structure
 * 
 * Examines the active call 201192 to understand the complete data structure
 * and identify all potential closure-related fields.
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

function analyzeObjectStructure(obj, prefix = '', depth = 0) {
  if (depth > 3) return; // Prevent infinite recursion
  
  Object.keys(obj).forEach(key => {
    const value = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (value === null || value === undefined) {
      console.log(`${fullKey}: null/undefined`);
    } else if (typeof value === 'object' && !Array.isArray(value)) {
      console.log(`${fullKey}: [Object]`);
      if (depth < 2) {
        analyzeObjectStructure(value, fullKey, depth + 1);
      }
    } else if (Array.isArray(value)) {
      console.log(`${fullKey}: [Array] (${value.length} items)`);
      if (value.length > 0 && typeof value[0] === 'object') {
        console.log(`${fullKey}[0] structure:`);
        analyzeObjectStructure(value[0], `${fullKey}[0]`, depth + 1);
      }
    } else {
      const lowerKey = key.toLowerCase();
      const isClosureRelated = lowerKey.includes('close') || lowerKey.includes('end') || 
                              lowerKey.includes('complete') || lowerKey.includes('finish') ||
                              lowerKey.includes('clear') || lowerKey.includes('state') ||
                              lowerKey.includes('status');
      
      const marker = isClosureRelated ? ' *** POTENTIAL CLOSURE FIELD ***' : '';
      console.log(`${fullKey}: ${typeof value} = "${value}"${marker}`);
    }
  });
}

async function analyzeCurrentCallStructure() {
  console.log('Analyzing Current Call Structure for Closure Data');
  console.log('================================================');
  
  try {
    const token = await getResgridToken();
    if (!token) {
      console.error('Failed to get Resgrid API token');
      return;
    }
    
    const callId = '201192'; // Current active call
    console.log(`Analyzing call ${callId}...`);
    
    // Get call data
    console.log('\n=== CALL DATA STRUCTURE ===');
    const callResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (callResponse.ok) {
      const callData = await callResponse.json();
      console.log('Complete call data structure:');
      analyzeObjectStructure(callData);
    } else {
      console.log(`GetCall failed: ${callResponse.status}`);
    }
    
    // Get extra data
    console.log('\n=== EXTRA DATA STRUCTURE ===');
    const extraResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (extraResponse.ok) {
      const extraData = await extraResponse.json();
      console.log('Complete extra data structure:');
      analyzeObjectStructure(extraData);
    } else {
      console.log(`GetCallExtraData failed: ${extraResponse.status}`);
    }
    
    // Also try GetActiveCalls to see if closure data exists there
    console.log('\n=== ACTIVE CALLS STRUCTURE ===');
    const activeResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetActiveCalls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (activeResponse.ok) {
      const activeData = await activeResponse.json();
      const activeCalls = activeData.Data || [];
      const targetCall = activeCalls.find(call => call.CallId === callId);
      
      if (targetCall) {
        console.log('Call structure from GetActiveCalls:');
        analyzeObjectStructure(targetCall);
      } else {
        console.log('Call not found in active calls');
      }
    } else {
      console.log(`GetActiveCalls failed: ${activeResponse.status}`);
    }
    
  } catch (error) {
    console.error('Error analyzing call structure:', error.message);
  }
}

// Run the analysis
analyzeCurrentCallStructure();