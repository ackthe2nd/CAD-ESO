/**
 * Analyze DOB Reference Id Issue
 * Check actual CAD data structure to find correct Reference Id field for DOB
 */

require('dotenv').config();
const axios = require('axios');

async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v3/Auth/Validate', {
      Usr: process.env.RESGRID_USER,
      Pass: process.env.RESGRID_PASS
    });
    
    return response.data;
  } catch (error) {
    console.error('Error getting token:', error.response?.data || error.message);
    throw error;
  }
}

async function fetchRecentCall(token) {
  try {
    // Get recent calls to analyze structure
    const response = await axios.get('https://api.resgrid.com/api/v3/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const calls = response.data;
    
    if (calls && calls.length > 0) {
      console.log(`Found ${calls.length} active calls`);
      return calls[0];
    }
    
    // If no active calls, try to get recent calls from a different endpoint
    console.log('No active calls found, checking for recent calls...');
    
    // Try getting recent calls with date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30); // Last 30 days
    
    const recentResponse = await axios.get('https://api.resgrid.com/api/v3/Calls/GetCallsForDateRange', {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
    
    const recentCalls = recentResponse.data;
    if (recentCalls && recentCalls.length > 0) {
      console.log(`Found ${recentCalls.length} recent calls`);
      return recentCalls[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching calls:', error.response?.data || error.message);
    return null;
  }
}

async function fetchCallExtraData(token, callId) {
  try {
    const response = await axios.get(`https://api.resgrid.com/api/v3/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error fetching call extra data:', error.response?.data || error.message);
    return null;
  }
}

function analyzeDataStructure(data, prefix = '', maxDepth = 3, currentDepth = 0) {
  if (currentDepth >= maxDepth) return;
  
  for (const [key, value] of Object.entries(data)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    // Look for fields that might contain DOB or Reference Id
    if (key.toLowerCase().includes('dob') || 
        key.toLowerCase().includes('birth') || 
        key.toLowerCase().includes('reference') ||
        key.toLowerCase().includes('patient') ||
        key.toLowerCase().includes('external')) {
      console.log(`🎯 POTENTIAL DOB/REFERENCE FIELD: ${fullKey} = ${JSON.stringify(value)}`);
    }
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      analyzeDataStructure(value, fullKey, maxDepth, currentDepth + 1);
    }
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('ANALYZING DOB REFERENCE ID MAPPING');
  console.log('='.repeat(60));
  
  try {
    console.log('Getting Resgrid API token...');
    const token = await getResgridToken();
    console.log('✓ Token obtained');
    
    console.log('\nFetching recent call data...');
    const call = await fetchRecentCall(token);
    
    if (!call) {
      console.log('No call data available for analysis');
      return;
    }
    
    console.log(`\nAnalyzing call ID: ${call.Id || call.CallId || 'Unknown'}`);
    console.log('='.repeat(40));
    
    console.log('\n📋 BASIC CALL DATA STRUCTURE:');
    analyzeDataStructure(call);
    
    // Try to get extra data if available
    const callId = call.Id || call.CallId;
    if (callId) {
      console.log('\n📋 EXTRA CALL DATA STRUCTURE:');
      const extraData = await fetchCallExtraData(token, callId);
      if (extraData) {
        analyzeDataStructure(extraData);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('CURRENT XML GENERATOR DOB LOGIC:');
    console.log('='.repeat(60));
    console.log('❌ Uses hardcoded fallback: "2001-01-01"');
    console.log('❌ Only searches nature/note text for DOB patterns');
    console.log('❌ Does not check for Reference Id field in CAD data');
    
    console.log('\n' + '='.repeat(60));
    console.log('RECOMMENDED FIXES:');
    console.log('='.repeat(60));
    console.log('1. Check call.ReferenceId or call.ExternalId for actual DOB');
    console.log('2. Check extraData for patient-specific fields');
    console.log('3. Remove hardcoded "2001-01-01" fallback');
    console.log('4. Only use actual DOB data from CAD system');
    
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

main();