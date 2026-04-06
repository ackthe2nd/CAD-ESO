/**
 * Test script to verify the automatic token refresh logic
 * 
 * This script demonstrates how the token-manager handles refreshing tokens
 * when they expire or when a 401 error is encountered.
 */
require('dotenv').config();
const { getApiToken, apiClient } = require('./src/token-manager');
const { logger } = require('./src/logger');

async function testTokenRefresh() {
  try {
    console.log('Testing token refresh mechanism...');
    
    // Step 1: Get an initial token
    console.log('\n[Step 1] Retrieving initial API token...');
    const initialToken = await getApiToken();
    console.log(`✓ Successfully retrieved initial token (first ${8} chars): ${initialToken.substring(0, 8)}...`);
    
    // Step 2: Force refresh the token
    console.log('\n[Step 2] Forcing token refresh...');
    const refreshedToken = await getApiToken(true);
    console.log(`✓ Successfully refreshed token (first ${8} chars): ${refreshedToken.substring(0, 8)}...`);
    
    if (initialToken !== refreshedToken) {
      console.log('✓ Tokens are different as expected after forced refresh');
    } else {
      console.log('⚠️ Tokens are the same after forced refresh (unexpected behavior)');
    }
    
    // Step 3: Test the API client with automatic token handling
    console.log('\n[Step 3] Testing API client with automatic token handling...');
    try {
      const response = await apiClient.get('Units/GetAllUnitsForSystem');
      
      console.log(`✓ API request successful. Retrieved ${response.data?.length || 0} units.`);
    } catch (error) {
      console.error(`✗ API request failed: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}, Data:`, error.response.data);
      }
    }
    
    // Step 4: Simulate a 401 error and token refresh
    console.log('\n[Step 4] Simulating a 401 error scenario (using an invalid token)...');
    console.log('  This test will temporarily modify the Authorization header to trigger a 401');
    
    // Create a modified API client that will use an invalid token for the first request
    const testClient = apiClient;
    
    // Override the request interceptor just for this test
    const originalRequestInterceptors = testClient.interceptors.request.handlers;
    testClient.interceptors.request.handlers = [];
    
    testClient.interceptors.request.use(
      async (config) => {
        // For our test, we'll add an invalid token to trigger a 401
        console.log('  → Sending request with invalid token to trigger 401...');
        config.headers.Authorization = 'Bearer invalid_token_to_trigger_401';
        return config;
      },
      (error) => Promise.reject(error)
    );
    
    try {
      const response = await testClient.get('Units/GetAllUnitsForSystem');
      
      console.log(`✓ 401 recovery successful. API request completed after token refresh.`);
      console.log(`  Retrieved ${response.data?.length || 0} units.`);
    } catch (error) {
      console.error(`✗ 401 recovery test failed: ${error.message}`);
      if (error.response) {
        console.error(`  Status: ${error.response.status}, Data:`, error.response.data);
      } else {
        console.error(`  No response data available`);
      }
    }
    
    // Restore the original interceptors
    testClient.interceptors.request.handlers = originalRequestInterceptors;
    
    console.log('\nToken refresh test complete!');
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
  }
}

// Run the test
testTokenRefresh();