/**
 * Debug Call 201108 Response Structure
 * Examine the actual API response to understand the data format
 */

require('dotenv').config();
const axios = require('axios');
const { HistoricCallFetcher } = require('./fetch-historic-calls.js');

async function getWorkingToken() {
  const fetcher = new HistoricCallFetcher();
  await fetcher.initialize();
  return fetcher.token;
}

async function debugCall201108() {
  console.log('=== DEBUGGING CALL 201108 API RESPONSES ===');
  
  // Get API token
  const token = await getWorkingToken();
  console.log('✅ Got API token');

  const callId = 201108;
  
  // Test all three endpoints and log the complete response structure
  const endpoints = [
    {
      name: 'GetCall',
      url: 'https://api.resgrid.com/api/v4/Calls/GetCall',
      params: { callId }
    },
    {
      name: 'GetCalls',
      url: 'https://api.resgrid.com/api/v4/Calls/GetCalls',
      params: { callId }
    },
    {
      name: 'GetCallHistory',
      url: 'https://api.resgrid.com/api/v4/Calls/GetCallHistory',
      params: { callId }
    }
  ];

  for (const endpoint of endpoints) {
    console.log(`\n--- Testing ${endpoint.name} ---`);
    
    try {
      const response = await axios.get(endpoint.url, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: endpoint.params
      });

      console.log('Status:', response.status);
      console.log('Response structure keys:', Object.keys(response.data || {}));
      
      if (response.data) {
        // Log the complete structure
        console.log('Complete response data:');
        console.log(JSON.stringify(response.data, null, 2));
        
        // Check for different data patterns
        if (response.data.Data) {
          console.log('Found Data array with', response.data.Data.length, 'items');
          if (response.data.Data.length > 0) {
            console.log('First item keys:', Object.keys(response.data.Data[0]));
          }
        }
        
        if (Array.isArray(response.data)) {
          console.log('Direct array with', response.data.length, 'items');
          if (response.data.length > 0) {
            console.log('First item keys:', Object.keys(response.data[0]));
          }
        }
        
        if (response.data.CallId) {
          console.log('Single call object with ID:', response.data.CallId);
          console.log('Call object keys:', Object.keys(response.data));
        }
      }
      
    } catch (error) {
      console.log('Error:', error.message);
      if (error.response) {
        console.log('Error status:', error.response.status);
        console.log('Error data:', error.response.data);
      }
    }
  }

  console.log('\n=== DEBUGGING COMPLETE ===');
}

debugCall201108().catch(console.error);