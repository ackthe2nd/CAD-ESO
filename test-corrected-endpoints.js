/**
 * Test Corrected Resgrid API Endpoints
 * 
 * This script tests the corrected endpoints based on user feedback
 */
require('dotenv').config();
const axios = require('axios');

// Base URL for all endpoints
const BASE_URL = 'https://api.resgrid.com/api/v4';

// Sample IDs to use for testing
const SAMPLE_CALL_ID = '198513';
const SAMPLE_USER_ID = 'F1457F34-94B7-402A-964A-7FE4BCC198F7';

// List of endpoints to test with corrections
const endpoints = [
  // Corrected endpoints
  { 
    name: 'Get Calls In Date Range (Corrected)', 
    method: 'GET', 
    path: '/Calls/GetCalls', 
    params: 'startDate=2025-05-04%2012%3A47%3A44&endDate=2025-05-05%2020%3A43%3A22', 
    requiresAuth: true 
  },
  { 
    name: 'Get Personnel Info (Corrected)', 
    method: 'GET', 
    path: '/Personnel/GetPersonnelInfo', 
    params: `userId=${SAMPLE_USER_ID}`, 
    requiresAuth: true 
  },
  { 
    name: 'Get Current Personnel Status (Corrected)', 
    method: 'GET', 
    path: '/PersonnelStatuses/GetCurrentStatus', 
    params: `userId=${SAMPLE_USER_ID}`, 
    requiresAuth: true 
  }
];

// Function to get API token
async function getApiToken() {
  try {
    console.log('Getting Resgrid API token...');
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const response = await axios.post(`${BASE_URL}/Connect/token`, 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('Successfully obtained API token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`Failed to get API token: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  return null;
}

// Function to test a single endpoint
async function testEndpoint(endpoint, token) {
  try {
    console.log(`\n📡 Testing: ${endpoint.name}`);
    console.log(`Method: ${endpoint.method}`);
    console.log(`URL: ${BASE_URL}${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}`);
    
    const config = {
      headers: {},
      timeout: 10000 // 10 second timeout for each request
    };
    
    if (endpoint.requiresAuth) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    config.headers['Accept'] = 'application/json';
    
    let response;
    if (endpoint.method === 'GET') {
      const url = `${BASE_URL}${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}`;
      response = await axios.get(url, config);
    } else if (endpoint.method === 'POST') {
      response = await axios.post(`${BASE_URL}${endpoint.path}`, endpoint.params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          ...config.headers
        },
        timeout: 10000
      });
    }
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    // Check if response has data
    if (response.data) {
      if (response.data.Data !== undefined) {
        // For endpoints that follow the Resgrid pattern with a Data property
        if (Array.isArray(response.data.Data)) {
          console.log(`  Response contains an array with ${response.data.Data.length} items`);
          
          // Show sample of first item if it exists
          if (response.data.Data.length > 0) {
            const sampleKeys = Object.keys(response.data.Data[0]);
            console.log(`  Sample fields: ${sampleKeys.join(', ')}`);
          }
        } else if (typeof response.data.Data === 'object' && response.data.Data !== null) {
          console.log(`  Response contains an object with ${Object.keys(response.data.Data).length} properties`);
          console.log(`  Properties: ${Object.keys(response.data.Data).join(', ')}`);
        } else if (response.data.Data === null) {
          console.log(`  Response Data is null`);
        } else {
          console.log(`  Response Data: ${JSON.stringify(response.data.Data).substring(0, 100)}...`);
        }
      } else {
        // For other response patterns
        console.log(`  Response: ${JSON.stringify(response.data).substring(0, 100)}...`);
      }
    }
    
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      params: endpoint.params,
      status: 'success',
      statusCode: response.status
    };
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    let errorDetails = '';
    if (error.response) {
      console.error(`  Status code: ${error.response.status}`);
      
      if (error.response.data) {
        if (typeof error.response.data === 'object') {
          errorDetails = JSON.stringify(error.response.data);
          console.error(`  Response data: ${errorDetails.substring(0, 200)}`);
        } else {
          errorDetails = error.response.data;
          console.error(`  Response data: ${errorDetails.substring(0, 200)}`);
        }
      }
    }
    
    return {
      endpoint: endpoint.name,
      path: endpoint.path,
      params: endpoint.params,
      status: 'error',
      statusCode: error.response ? error.response.status : 0,
      notes: errorDetails
    };
  }
}

// Main function to test all endpoints
async function testCorrectedEndpoints() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token, aborting endpoint tests');
    return;
  }
  
  const results = [];
  const successfulEndpoints = [];
  const failedEndpoints = [];
  
  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint, token);
    results.push(result);
    
    if (result.status === 'success') {
      successfulEndpoints.push(result);
    } else {
      failedEndpoints.push(result);
    }
  }
  
  console.log('\n📊 TEST SUMMARY:');
  console.log(`Total Endpoints Tested: ${results.length}`);
  console.log(`Successful: ${successfulEndpoints.length}`);
  console.log(`Failed: ${failedEndpoints.length}`);
  
  console.log('\n✅ SUCCESSFUL ENDPOINTS:');
  successfulEndpoints.forEach(endpoint => {
    console.log(`- ${endpoint.endpoint} (${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''})`);
  });
  
  console.log('\n❌ FAILED ENDPOINTS:');
  failedEndpoints.forEach(endpoint => {
    console.log(`- ${endpoint.endpoint} (${endpoint.path}${endpoint.params ? '?' + endpoint.params : ''}): ${endpoint.statusCode}`);
  });
}

// Execute the tests
testCorrectedEndpoints().catch(console.error);