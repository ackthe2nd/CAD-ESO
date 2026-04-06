/**
 * Check status of STN1 by creating a new call and checking its details
 */
require('dotenv').config();
const axios = require('axios');

const UNIT_TO_CHECK = 'STN1';

async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  try {
    console.log('Getting Resgrid API token...');
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
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
  }
  return null;
}

async function createTestCall(token) {
  try {
    console.log('Creating a test call to check unit status...');
    
    const callData = {
      Name: 'STATUS TEST CALL',
      Priority: '1559', // Normal priority
      Address: '123 Test St, Testville, CA 12345',
      Notes: 'This is a test call to check unit status',
      GeoLocationData: '37.7749,-122.4194',
      CallTypeId: '47',
      Dispatches: [
        {
          Type: "Unit", 
          Name: UNIT_TO_CHECK
        }
      ]
    };
    
    const response = await axios.post(
      'https://api.resgrid.com/api/v4/Calls/SaveCall',
      callData,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.Data) {
      console.log(`Created test call with ID ${response.data.Data}`);
      return response.data.Data;
    } else {
      console.error('Failed to create test call');
      console.log('Response:', response.data);
      return null;
    }
  } catch (error) {
    console.error(`Error creating test call: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return null;
  }
}

async function checkUnitStatusInCall(token, callId) {
  try {
    console.log(`Checking status of ${UNIT_TO_CHECK} in call ${callId}...`);
    
    const response = await axios.get(
      `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.data && response.data.Data) {
      const callData = response.data.Data;
      
      console.log(`Call ${callId} extra data retrieved`);
      
      // Check activity data
      if (callData.Activity && Array.isArray(callData.Activity)) {
        console.log(`Call has ${callData.Activity.length} activity entries`);
        
        const unitActivity = callData.Activity.filter(a => a.Name === UNIT_TO_CHECK);
        console.log(`Found ${unitActivity.length} activity entries for ${UNIT_TO_CHECK}`);
        
        for (const activity of unitActivity) {
          console.log(`Activity: StatusId=${activity.StatusId}, StatusText=${activity.StatusText || 'Unknown'}, Time=${activity.Timestamp}`);
        }
      } else {
        console.log('No activity data found');
      }
      
      // Check dispatch data
      if (callData.Dispatches && Array.isArray(callData.Dispatches)) {
        console.log(`Call has ${callData.Dispatches.length} dispatch entries`);
        
        const unitDispatches = callData.Dispatches.filter(d => d.Name === UNIT_TO_CHECK);
        console.log(`Found ${unitDispatches.length} dispatch entries for ${UNIT_TO_CHECK}`);
        
        for (const dispatch of unitDispatches) {
          console.log(`Dispatch: StatusId=${dispatch.StatusId}, StatusText=${dispatch.StatusText || 'Unknown'}, Time=${dispatch.Timestamp}`);
        }
      } else {
        console.log('No dispatch data found');
      }
      
      return callData;
    } else {
      console.error(`Failed to retrieve call data for ${callId}`);
      return null;
    }
  } catch (error) {
    console.error(`Error checking call data: ${error.message}`);
    return null;
  }
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not get API token. Exiting.');
    return;
  }
  
  try {
    // Attempt to get status by checking current active calls
    console.log('Checking active calls for unit status...');
    
    const callsResponse = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      }
    );
    
    if (callsResponse.data && Array.isArray(callsResponse.data.Data)) {
      const calls = callsResponse.data.Data;
      console.log(`Found ${calls.length} active calls`);
      
      // Check each call to see if STN1 is dispatched and get its status
      for (const call of calls) {
        await checkUnitStatusInCall(token, call.CallId);
      }
    } else {
      console.log('No active calls found or unexpected response format');
    }
    
    // Create a new test call to check unit status
    // Disabled for now to avoid creating unwanted test calls
    /*
    const callId = await createTestCall(token);
    if (callId) {
      await checkUnitStatusInCall(token, callId);
    }
    */
  } catch (error) {
    console.error(`Error in main workflow: ${error.message}`);
  }
  
  console.log('Test completed');
}

main().catch(console.error);