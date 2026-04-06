/**
 * Check STN1 status using the direct UnitStatus/GetUnitStatus endpoint
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const UNIT_NAME = 'STN1';

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

async function getUnitStatus(token, unitName) {
  try {
    console.log(`Checking status for unit ${unitName}...`);
    
    // Try using the suggested /UnitStatus/GetUnitStatus endpoint
    const url = `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitName=${encodeURIComponent(unitName)}`;
    
    console.log(`Using endpoint: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.Data) {
      const status = response.data.Data;
      
      console.log('\n🔔 UNIT STATUS DETAILS:');
      console.log(`  Unit Name: ${unitName}`);
      console.log(`  StatusId: ${status.StatusId}`);
      console.log(`  Status: ${status.Status || 'Unknown'}`);
      console.log(`  StateId: ${status.StateId}`);
      console.log(`  State: ${status.State || 'Unknown'}`);
      console.log(`  Timestamp: ${status.Timestamp || 'Unknown'}`);
      console.log();
      
      // Map status code to known names
      const statusNames = {
        2: 'Available',
        3: 'Committed/At Patient',
        5: 'En Route/Responding',
        6: 'On Scene', 
        8: 'Cleared',
        9: 'Returning'
      };
      
      if (statusNames[status.StatusId]) {
        console.log(`🔍 Mapped Status: StatusId ${status.StatusId} = "${statusNames[status.StatusId]}"`);
      }
    } else {
      console.log('No unit status data found or unexpected response format');
    }
  } catch (error) {
    console.error(`Error checking unit status: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  
  // Also try version 3 of the API (without the /v4/ segment)
  try {
    console.log(`\nTrying v3 API endpoint...`);
    const v3Url = `https://api.resgrid.com/api/UnitStatus/GetUnitStatus?unitName=${encodeURIComponent(unitName)}`;
    
    console.log(`Using endpoint: ${v3Url}`);
    
    const v3Response = await axios.get(v3Url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('V3 API Response:', JSON.stringify(v3Response.data, null, 2));
  } catch (error) {
    console.error(`Error checking v3 unit status: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
    }
  }
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  await getUnitStatus(token, UNIT_NAME);
  console.log('Test complete');
}

main().catch(console.error);