/**
 * Script to examine call extra data structure
 */
require('dotenv').config();
const axios = require('axios');

async function getToken() {
  const tokenRequestData = new URLSearchParams();
  tokenRequestData.append('grant_type', 'password');
  tokenRequestData.append('username', process.env.RESGRID_USER);
  tokenRequestData.append('password', process.env.RESGRID_PASS);
  
  const tokenResponse = await axios.post(
    'https://api.resgrid.com/api/v4/Connect/token',
    tokenRequestData.toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );
  
  return tokenResponse.data.access_token;
}

async function getCallExtraData(token, callId) {
  const response = await axios.get(
    `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.data;
}

async function main() {
  try {
    console.log('Getting token...');
    const token = await getToken();
    console.log('Token obtained successfully');
    
    console.log('Fetching call extra data...');
    const callExtraData = await getCallExtraData(token, '198513');
    
    console.log('\nCall Extra Data structure:');
    console.log('Top level fields:', Object.keys(callExtraData).join(', '));
    
    if (callExtraData.Data) {
      console.log('\nData fields:', Object.keys(callExtraData.Data).join(', '));
      
      // Check if there are Activities
      if (callExtraData.Data.Activity && Array.isArray(callExtraData.Data.Activity)) {
        console.log(`\nActivities: ${callExtraData.Data.Activity.length} items`);
        if (callExtraData.Data.Activity.length > 0) {
          console.log('First activity fields:', Object.keys(callExtraData.Data.Activity[0]).join(', '));
          console.log('First activity:', JSON.stringify(callExtraData.Data.Activity[0], null, 2));
        }
      }
      
      // Check if there are Dispatches
      if (callExtraData.Data.Dispatches && Array.isArray(callExtraData.Data.Dispatches)) {
        console.log(`\nDispatches: ${callExtraData.Data.Dispatches.length} items`);
        if (callExtraData.Data.Dispatches.length > 0) {
          console.log('First dispatch fields:', Object.keys(callExtraData.Data.Dispatches[0]).join(', '));
          console.log('First dispatch:', JSON.stringify(callExtraData.Data.Dispatches[0], null, 2));
        }
      }
      
      // Check call form data
      if (callExtraData.Data.CallFormData) {
        console.log('\nCall Form Data:', callExtraData.Data.CallFormData);
        
        try {
          // Try to parse if it's a string
          if (typeof callExtraData.Data.CallFormData === 'string') {
            const parsedData = JSON.parse(callExtraData.Data.CallFormData);
            console.log('\nParsed Call Form Data:', parsedData);
          }
        } catch (e) {
          console.log('Could not parse CallFormData as JSON');
        }
      }
      
      // Check Priority fields
      if (callExtraData.Data.Priority) {
        console.log('\nPriority data:', callExtraData.Data.Priority);
      }
      
      // Check Protocols
      if (callExtraData.Data.Protocols) {
        console.log('\nProtocols:', callExtraData.Data.Protocols);
      }
      
      // Print full data for better analysis
      console.log('\nFull Data Object:');
      console.log(JSON.stringify(callExtraData.Data, null, 2));
    } else {
      console.log('No Data field found in response');
      console.log(JSON.stringify(callExtraData, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();