const axios = require('axios');
require('dotenv').config();

// For testing purposes, let's use our actual environment variables
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;

async function tryAuthentication(username, password) {
  console.log(`Trying with username: ${username}, password: ${password}`);
  
  const endpoint = 'https://api.resgrid.com/api/v4/Connect/token';
  
  try {
    // OAuth style endpoint
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', username);
    formData.append('password', password);
    
    console.log('Sending request to:', endpoint);
    console.log('Form data:', formData.toString());
    
    const response = await axios.post(
      endpoint,
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    if (response.status === 200 && response.data && response.data.access_token) {
      console.log('Successfully obtained new API token');
      return response.data.access_token;
    } else {
      console.error('Failed to obtain API token: Unexpected response format');
      return null;
    }
  } catch (error) {
    console.error(`Request error: ${error.message}`);
    if (error.response) {
      console.error('Error response status:', error.response.status);
      console.error('Error response data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('No response received');
    }
    return null;
  }
}

async function testConnectTokenEndpoint() {
  console.log('Testing Resgrid Connect/token endpoint...');
  
  // Try the normal way first
  console.log('\n--- ATTEMPT #1: Using credentials as-is ---');
  const token1 = await tryAuthentication(RESGRID_USER, RESGRID_PASS);
  
  // If that fails, try swapped credentials
  if (!token1) {
    console.log('\n--- ATTEMPT #2: Using swapped credentials ---');
    const token2 = await tryAuthentication(RESGRID_PASS, RESGRID_USER);
    return token2;
  }
  
  return token1;
}

// Run the test
testConnectTokenEndpoint().then(token => {
  if (token) {
    console.log('\nTest successful, token obtained!');
  } else {
    console.log('\nTest failed, no token obtained.');
  }
});