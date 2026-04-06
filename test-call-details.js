/**
 * Examine raw call data for call 198513 to look for returning status information
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CALL_ID = '198513';

async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  if (!username || !password) {
    throw new Error('Missing Resgrid credentials in environment variables');
  }
  
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
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    console.error(`Failed to get API token: ${error.message}`);
    throw error;
  }
}

async function getCallData(token) {
  try {
    console.log(`Fetching data for call ${CALL_ID}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${CALL_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch call data: ${error.message}`);
    throw error;
  }
}

async function getCallExtraData(token) {
  try {
    console.log(`Fetching extra data for call ${CALL_ID}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${CALL_ID}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch call extra data: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    // Get API token
    const token = await getApiToken();
    
    // Get call data
    const callData = await getCallData(token);
    
    // Get call extra data
    const extraData = await getCallExtraData(token);
    
    // Save the raw data to files in the logs directory
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Write call data to file
    fs.writeFileSync(
      path.join(logsDir, `call_${CALL_ID}_data.json`),
      JSON.stringify(callData, null, 2)
    );
    console.log(`Call data saved to logs/call_${CALL_ID}_data.json`);
    
    // Write call extra data to file
    fs.writeFileSync(
      path.join(logsDir, `call_${CALL_ID}_extra_data.json`),
      JSON.stringify(extraData, null, 2)
    );
    console.log(`Call extra data saved to logs/call_${CALL_ID}_extra_data.json`);
    
    // Look for returning status
    console.log('\nSEARCHING FOR RETURNING STATUS:');
    if (extraData.Data && extraData.Data.Activity && Array.isArray(extraData.Data.Activity)) {
      console.log(`Call has ${extraData.Data.Activity.length} activities`);
      
      // Check each activity for "returning" text
      const returningActivities = extraData.Data.Activity.filter(activity => {
        if (!activity) return false;
        
        // Convert the entire activity object to JSON and search for "returning"
        const activityStr = JSON.stringify(activity).toLowerCase();
        return activityStr.includes('returning');
      });
      
      if (returningActivities.length > 0) {
        console.log(`Found ${returningActivities.length} activities containing 'returning':`);
        returningActivities.forEach((activity, i) => {
          console.log(`Activity ${i+1}:`);
          console.log(JSON.stringify(activity, null, 2));
        });
      } else {
        console.log('No activities containing "returning" were found');
      }
    } else {
      console.log('No activity data found in call');
    }
    
    console.log('\nDone.');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

main();