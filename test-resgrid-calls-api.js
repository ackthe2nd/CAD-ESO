/**
 * Test script for Resgrid API v4 Calls endpoints from official documentation
 * Based on endpoints listed at https://api.resgrid.com/index.html
 */
require('dotenv').config();
const axios = require('axios');

// Get credentials from environment variables
const username = process.env.RESGRID_USER;
const password = process.env.RESGRID_PASS;

if (!username || !password) {
  console.error('ERROR: RESGRID_USER and RESGRID_PASS environment variables must be set');
  process.exit(1);
}

// Endpoints from the official documentation
const ENDPOINTS = [
  // These are the exact endpoints from the API documentation
  'Calls/GetActiveCalls',
  'Calls/CallsByDateRange',
  'Calls/CallsByStartDateTimeRange',
  'Calls/GetCallById',
  'Calls/GetCallsByDepartment',
  'Calls/GetCallsByDepartmentId',
  'Calls/GetCallsByDepartmentIdFilter',
  'Calls/GetCallsByStartDate',
  'Calls/GetCallsByStation',
  'Calls/GetActiveCallsByDepartmentId',
  'Calls/GetActiveCallsByDepartmentIdFilter'
];

/**
 * Get an API token
 */
async function getToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('Token obtained successfully!');
      return response.data.access_token;
    }
    return null;
  } catch (error) {
    console.log(`❌ Token endpoint failed: ${error.message}`);
    return null;
  }
}

/**
 * Test an endpoint with a token
 */
async function testEndpoint(token, endpoint) {
  try {
    const url = `https://api.resgrid.com/api/v4/${endpoint}`;
    console.log(`Testing ${url}...`);
    
    // Set up parameters based on endpoint
    let params = {};
    
    // Add parameters for specific endpoints
    if (endpoint === 'Calls/CallsByDateRange') {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      params = {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
    } else if (endpoint === 'Calls/CallsByStartDateTimeRange') {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);
      
      params = {
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString()
      };
    } else if (endpoint === 'Calls/GetCallById') {
      params = { callId: '0' }; // This will likely fail but let's try
    } else if (endpoint.includes('Department') && !endpoint.includes('Filter')) {
      params = { departmentId: '0' }; // This will likely fail but let's try
    }
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params
    });
    
    // Check if we got a valid response
    if (response.status >= 200 && response.status < 300) {
      const data = response.data;
      if (Array.isArray(data)) {
        console.log(`✅ Success! Endpoint returned an array with ${data.length} items`);
        if (data.length > 0) {
          console.log(`  Sample call ID: ${data[0].CallId || data[0].Id || 'unknown'}`);
        }
      } else {
        console.log(`✅ Success! Endpoint returned a valid response`);
      }
      return { success: true, data };
    } else {
      console.log(`❌ Failed with status code: ${response.status}`);
      return { success: false };
    }
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Resgrid API v4 Calls Endpoints Tester\n');
  console.log(`Testing with username: ${username}`);
  
  // Get token
  console.log('Getting token for v4...');
  const token = await getToken();
  
  if (!token) {
    console.log('❌ Could not get token for v4, aborting test');
    return;
  }
  
  // Test each endpoint
  const results = [];
  for (const endpoint of ENDPOINTS) {
    const result = await testEndpoint(token, endpoint);
    results.push({ endpoint, ...result });
  }
  
  // Print summary
  console.log('\n📊 SUMMARY:');
  console.log('=================');
  
  const workingEndpoints = results.filter(r => r.success);
  
  if (workingEndpoints.length === 0) {
    console.log('❌ No working endpoints found in v4 for retrieving calls.');
    console.log('\nTroubleshooting steps:');
    console.log('1. Check if your account has sufficient permissions');
    console.log('2. Verify if your department has any active or recent calls');
    console.log('3. Contact Resgrid support if issues persist');
  } else {
    console.log('✅ Working endpoints for v4:');
    workingEndpoints.forEach(({ endpoint }) => {
      console.log(`- ${endpoint}`);
    });
    
    // Find the best endpoint for recent calls
    const activeEndpoint = workingEndpoints.find(r => r.endpoint === 'Calls/GetActiveCalls');
    const dateRangeEndpoint = workingEndpoints.find(r => r.endpoint === 'Calls/CallsByDateRange');
    
    console.log('\n🔧 RECOMMENDED SOLUTION:');
    console.log('=================');
    
    if (activeEndpoint) {
      console.log('For active calls, use: Calls/GetActiveCalls');
    }
    
    if (dateRangeEndpoint) {
      console.log('For historical calls, use: Calls/CallsByDateRange');
    }
  }
}

// Run the main function
main().catch(error => {
  console.error('Unhandled error:', error.message);
});