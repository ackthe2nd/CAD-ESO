/**
 * Verify Dispatch Times for Call 201237
 * Check the original Resgrid data to confirm correct Pacific Time conversion
 */

require('dotenv').config();
const axios = require('axios');

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Authentication/GetToken', {
      Username: process.env.RESGRID_USER,
      Password: process.env.RESGRID_PASS
    });

    if (response.data && response.data.Token) {
      console.log('Successfully obtained API token');
      return response.data.Token;
    } else {
      throw new Error('No token in response');
    }
  } catch (error) {
    console.error('Failed to get API token:', error.message);
    return null;
  }
}

/**
 * Fetch call data for Call 201237
 */
async function fetchCall201237Data(token) {
  try {
    console.log('\n=== FETCHING CALL 201237 DATA ===');
    
    // Get basic call data
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=201237`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n--- BASIC CALL DATA ---');
    console.log('Call ID:', callResponse.data.CallId);
    console.log('LoggedOn:', callResponse.data.LoggedOn);
    console.log('LoggedOnUtc:', callResponse.data.LoggedOnUtc);
    console.log('DispatchedOn:', callResponse.data.DispatchedOn);
    console.log('DispatchedOnUtc:', callResponse.data.DispatchedOnUtc);
    
    // Get extra call data
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=201237`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n--- DISPATCH DATA ---');
    if (extraResponse.data.Data && extraResponse.data.Data.Dispatches) {
      extraResponse.data.Data.Dispatches.forEach((dispatch, index) => {
        console.log(`Dispatch ${index + 1}:`);
        console.log('  Name:', dispatch.Name);
        console.log('  Type:', dispatch.Type);
        console.log('  DispatchedOn:', dispatch.DispatchedOn);
        console.log('  Timestamp:', dispatch.Timestamp);
        console.log('');
      });
    }
    
    console.log('\n--- ACTIVITY DATA ---');
    if (extraResponse.data.Data && extraResponse.data.Data.Activity) {
      const unitActivities = extraResponse.data.Data.Activity.filter(a => a.Type === 'Unit');
      console.log(`Found ${unitActivities.length} unit activities:`);
      
      unitActivities.forEach((activity, index) => {
        console.log(`Activity ${index + 1}:`);
        console.log('  Name:', activity.Name || activity.UnitName);
        console.log('  StatusId:', activity.StatusId);
        console.log('  StatusText:', activity.StatusText || activity.DestinationStateText);
        console.log('  Timestamp:', activity.Timestamp);
        console.log('');
      });
    }
    
    // Convert timestamps to Pacific Time for verification
    console.log('\n--- PACIFIC TIME CONVERSIONS ---');
    
    function convertToPacificTime(timestamp) {
      if (!timestamp) return '';
      
      try {
        const date = new Date(timestamp);
        const pacificFormatter = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Los_Angeles',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        });
        
        const pacificParts = pacificFormatter.formatToParts(date);
        const year = pacificParts.find(part => part.type === 'year').value;
        const month = pacificParts.find(part => part.type === 'month').value;
        const day = pacificParts.find(part => part.type === 'day').value;
        const hours = pacificParts.find(part => part.type === 'hour').value;
        const minutes = pacificParts.find(part => part.type === 'minute').value;
        const seconds = pacificParts.find(part => part.type === 'second').value;
        
        return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
      } catch (error) {
        return timestamp;
      }
    }
    
    console.log('LoggedOn UTC:', callResponse.data.LoggedOnUtc);
    console.log('LoggedOn Pacific:', convertToPacificTime(callResponse.data.LoggedOnUtc));
    console.log('');
    console.log('LoggedOn (already Pacific?):', callResponse.data.LoggedOn);
    console.log('LoggedOn converted again:', convertToPacificTime(callResponse.data.LoggedOn));
    
    return {
      callData: callResponse.data,
      extraData: extraResponse.data
    };
    
  } catch (error) {
    console.error('Error fetching call data:', error.message);
    return null;
  }
}

async function main() {
  console.log('VERIFYING DISPATCH TIMES FOR CALL 201237');
  console.log('=========================================');
  
  const token = await getApiToken();
  if (!token) {
    console.error('Failed to get API token');
    return;
  }
  
  const data = await fetchCall201237Data(token);
  if (!data) {
    console.error('Failed to fetch call data');
    return;
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log('Check the timestamps above to confirm if 2025-06-08 18:49:42 is correct Pacific Time');
}

main().catch(console.error);