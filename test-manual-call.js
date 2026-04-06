const axios = require('axios');
require('dotenv').config();

// Manually testing a few different Resgrid API endpoints to determine which one is correct
async function testEndpoints() {
  console.log('Environment variables:');
  console.log(`- RESGRID_USER: ${process.env.RESGRID_USER}`);
  console.log(`- RESGRID_PASS: ${process.env.RESGRID_PASS ? '******' : 'not set'}`);
  
  // Use credentials in their correct order
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  console.log(`Testing with credentials: username=${username}, password=${'*'.repeat(password ? password.length : 0)}`);
  
  const endpoints = [
    'https://api.resgrid.com/api/v4/Authenticate/login',
    'https://api.resgrid.com/api/v4/Authenticate/Login',
    'https://api.resgrid.com/api/v4/Authenticate/token',
    'https://api.resgrid.com/api/v4/Authenticate/Token',
    'https://api.resgrid.com/api/v4/TokenAuth/login',
    'https://api.resgrid.com/api/v4/TokenAuth/Login',
    'https://api.resgrid.com/api/v4/TokenAuth/token',
    'https://api.resgrid.com/Token'
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTesting endpoint: ${endpoint}`);
      
      const response = await axios.post(
        endpoint,
        {
          username,
          password
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          validateStatus: () => true
        }
      );
      
      console.log(`Status: ${response.status}`);
      if (response.data) {
        console.log('Data:', JSON.stringify(response.data, null, 2));
      }
    } catch (error) {
      console.error(`Error with ${endpoint}:`, error.message);
    }
  }
  
  // Try the OAuth/Token style endpoint as well
  try {
    console.log(`\nTesting Token endpoint with form data`);
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', username);
    formData.append('password', password);
    
    const response = await axios.post(
      'https://api.resgrid.com/Token',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        validateStatus: () => true
      }
    );
    
    console.log(`Status: ${response.status}`);
    if (response.data) {
      console.log('Data:', JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('Error with Token endpoint:', error.message);
  }
}

testEndpoints();