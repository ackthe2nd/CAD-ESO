/**
 * Check unit status using the direct GetUnitStatus endpoint with unitId parameter
 * This script demonstrates the working approach to get unit status directly
 */
require('dotenv').config();
const axios = require('axios');

// Unit mapping - Add all your unit IDs here
const UNIT_MAPPING = {
  'STN1': '8826',
  'STN2': '8825',
  'CMD11': '8824',
  'BLS11': '8827',
  'ALS11': '8829'
};

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

async function getUnitStatus(token, unitId, unitName) {
  try {
    console.log(`\nChecking status for unit ${unitName} (ID: ${unitId})...`);
    
    // Use the working endpoint with unitId parameter
    const url = `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId=${unitId}`;
    
    console.log(`Using endpoint: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Got response with status: ${response.status}`);
    
    if (response.data && response.data.Data) {
      const unit = response.data.Data;
      
      console.log('\n🔔 UNIT STATUS DETAILS:');
      console.log(`  Unit Name: ${unit.Name}`);
      console.log(`  Unit ID: ${unit.UnitId}`);
      console.log(`  Type: ${unit.Type}`);
      console.log(`  State: ${unit.State}`);
      console.log(`  Timestamp: ${unit.Timestamp}`);
      console.log(`  TimestampUTC: ${unit.TimestampUtc}`);
      
      if (unit.Latitude && unit.Longitude) {
        console.log(`  Location: ${unit.Latitude}, ${unit.Longitude}`);
      }
      
      if (unit.Note) {
        console.log(`  Note: ${unit.Note}`);
      }
      
      console.log(`\n✅ SUCCESS: Retrieved status directly using GetUnitStatus endpoint`);
      console.log(`Unit ${unitName} is currently: ${unit.State}`);
      console.log(`Last status change: ${new Date(unit.Timestamp).toLocaleString()}`);
      
      return unit;
    } else {
      console.log('❌ No unit data found or unexpected response format');
    }
  } catch (error) {
    console.error(`❌ Error checking unit status: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error(`Response data:`, error.response.data);
      }
    }
  }
  
  return null;
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  // Check STN1 status
  const stn1 = await getUnitStatus(token, UNIT_MAPPING['STN1'], 'STN1');
  
  // Check status for all known units
  console.log('\n🔔 CHECKING ALL KNOWN UNITS:');
  for (const [unitName, unitId] of Object.entries(UNIT_MAPPING)) {
    await getUnitStatus(token, unitId, unitName);
  }
  
  console.log('\nTest complete');
}

main().catch(console.error);