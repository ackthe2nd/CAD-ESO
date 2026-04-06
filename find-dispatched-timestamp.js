/**
 * Find the DispatchedOn timestamp in call 201192 data structure
 */
require('dotenv').config();
const axios = require('axios');

async function findDispatchedTimestamp() {
  try {
    console.log('Finding DispatchedOn timestamp in call 201192');
    console.log('============================================\n');

    // Get token
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const tokenResponse = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
      Username: username,
      Password: password
    });

    const token = tokenResponse.data.Tk;

    console.log('1. Fetching call data...');
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const callData = callResponse.data.Data;

    console.log('2. Fetching extra data...');
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const extraData = extraResponse.data.Data;

    console.log('\n3. Searching for DispatchedOn in all data locations:');
    
    // Function to recursively search for DispatchedOn
    function searchForDispatchedOn(obj, path = '') {
      const results = [];
      
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;
          
          if (key.toLowerCase().includes('dispatch') || 
              (typeof value === 'string' && value.includes('2025-06-08T13:26'))) {
            results.push({ path: currentPath, key, value });
          }
          
          if (typeof value === 'object') {
            results.push(...searchForDispatchedOn(value, currentPath));
          }
        }
      }
      
      return results;
    }

    console.log('\nCall Data results:');
    const callResults = searchForDispatchedOn(callData, 'callData');
    callResults.forEach(result => {
      console.log(`  ${result.path}: "${result.value}"`);
    });

    console.log('\nExtra Data results:');
    const extraResults = searchForDispatchedOn(extraData, 'extraData');
    extraResults.forEach(result => {
      console.log(`  ${result.path}: "${result.value}"`);
    });

    console.log('\n4. Checking Dispatches array specifically:');
    if (extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
      extraData.Dispatches.forEach((dispatch, index) => {
        console.log(`\nDispatch ${index + 1}:`);
        console.log(`  Type: ${dispatch.Type}`);
        console.log(`  Name: ${dispatch.Name}`);
        console.log(`  Timestamp: ${dispatch.Timestamp || 'NOT FOUND'}`);
        console.log(`  DispatchedOn: ${dispatch.DispatchedOn || 'NOT FOUND'}`);
        console.log(`  All fields: ${Object.keys(dispatch).join(', ')}`);
      });
    }

    console.log('\n5. Raw timestamp fields in call data:');
    const timestampFields = Object.keys(callData).filter(key => 
      key.toLowerCase().includes('time') || 
      key.toLowerCase().includes('date') ||
      key.toLowerCase().includes('on')
    );
    
    timestampFields.forEach(field => {
      console.log(`  ${field}: "${callData[field] || 'EMPTY'}"`);
    });

  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

if (require.main === module) {
  findDispatchedTimestamp();
}