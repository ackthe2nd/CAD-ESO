/**
 * Simple test script to check STN1 current status
 */
require('dotenv').config();
const axios = require('axios');

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

async function checkUnitStatus(token) {
  try {
    // Try to use a different endpoint to find available units
    console.log('Checking STN1 status via Personnel/GetPersonnelStatusByDepartment...');
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Personnel/GetPersonnelStatusByDepartment', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('API Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data && response.data.Data) {
      const personnel = response.data.Data;
      console.log(`Found ${personnel.length} personnel records`);
      
      // Look for "STN1" in the unit names/identifiers
      for (const person of personnel) {
        if (person.UnitName === 'STN1' || person.Identifier === 'STN1' || person.Name === 'STN1') {
          console.log(`\n🔔 FOUND STN1 in personnel status records:`);
          console.log(`  StatusId: ${person.StatusId}`);
          console.log(`  Status: ${person.Status || 'Unknown'}`);
          console.log(`  Timestamp: ${person.Timestamp}`);
          console.log();
        }
      }
    } else {
      console.log('No personnel status data found or unexpected response format');
    }
    
    // Also try units endpoint
    console.log('Checking STN1 status via Units/GetUnitsStatuses...');
    
    const unitsResponse = await axios.get('https://api.resgrid.com/api/v4/Units/GetUnitsStatuses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('API Response:', JSON.stringify(unitsResponse.data, null, 2));
    
    if (unitsResponse.data && unitsResponse.data.Data) {
      const units = unitsResponse.data.Data;
      console.log(`Found ${units.length} unit status records`);
      
      // Look for "STN1" in the units
      for (const unit of units) {
        if (unit.Name === 'STN1' || unit.UnitId === 'STN1') {
          console.log(`\n🔔 FOUND STN1 in unit status records:`);
          console.log(`  StatusId: ${unit.StatusId}`);
          console.log(`  Status: ${unit.Status || 'Unknown'}`);
          console.log(`  StateId: ${unit.StateId}`);
          console.log(`  State: ${unit.State || 'Unknown'}`);
          console.log(`  Timestamp: ${unit.Timestamp}`);
          console.log();
        }
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
}

async function main() {
  const token = await getApiToken();
  if (token) {
    await checkUnitStatus(token);
  }
  console.log('Test complete');
}

main().catch(console.error);