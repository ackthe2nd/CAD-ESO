const axios = require('axios');
require('dotenv').config();

// For testing purposes, let's use our actual environment variables
const RESGRID_USER = process.env.RESGRID_USER || 'EMSadmin';
const RESGRID_PASS = process.env.RESGRID_PASS || 'a1b2c3D *';

async function getApiToken() {
  try {
    console.log('Fetching new Resgrid API token...');
    console.log(`Using username: ${RESGRID_USER}`);
    
    const response = await axios.post(
      'https://api.resgrid.com/api/v4/Authenticate/login',
      {
        username: RESGRID_USER,
        password: RESGRID_PASS
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
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
    console.error(`Failed to obtain API token: ${error.message}`);
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    return null;
  }
}

// Test the token acquisition
async function runTest() {
  console.log('Testing Resgrid API token acquisition...');
  const token = await getApiToken();
  
  if (token) {
    console.log('Token successfully obtained!');
    
    // Test making an API call with the token
    try {
      console.log('Testing an API call with the token...');
      const response = await axios.get(
        'https://api.resgrid.com/api/v4/Calls',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      );
      
      console.log('API call successful!');
      console.log(`Retrieved ${response.data.length} calls`);
    } catch (error) {
      console.error(`API call failed: ${error.message}`);
    }
  }
}

runTest();