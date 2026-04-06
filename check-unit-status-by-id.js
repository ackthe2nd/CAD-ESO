/**
 * Check STN1 status using different variations of the UnitStatus endpoint
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const UNIT_NAME = 'STN1';
const UNIT_ID = 'STN1';  // If unit ID is different, adjust this value

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

async function tryMultipleEndpoints(token) {
  // List of endpoints to try
  const endpoints = [
    { 
      name: 'GetUnitStatus with unitId', 
      url: `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatus?unitId=${encodeURIComponent(UNIT_ID)}`
    },
    { 
      name: 'GetUnitStatusByUnitId', 
      url: `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatusByUnitId?unitId=${encodeURIComponent(UNIT_ID)}`
    },
    { 
      name: 'GetUnitStatusByName', 
      url: `https://api.resgrid.com/api/v4/UnitStatus/GetUnitStatusByName?name=${encodeURIComponent(UNIT_NAME)}`
    },
    { 
      name: 'Units/GetUnitStatusByUnitName',
      url: `https://api.resgrid.com/api/v4/Units/GetUnitStatusByUnitName?unitName=${encodeURIComponent(UNIT_NAME)}`
    },
    { 
      name: 'Units/GetActiveUnits',
      url: `https://api.resgrid.com/api/v4/Units/GetActiveUnits`
    },
    {
      name: 'Units/GetUnit',
      url: `https://api.resgrid.com/api/v4/Units/GetUnit?name=${encodeURIComponent(UNIT_NAME)}`
    },
    {
      name: 'Units/GetUnitInfo',
      url: `https://api.resgrid.com/api/v4/Units/GetUnitInfo?unitId=${encodeURIComponent(UNIT_ID)}`
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\nTrying endpoint: ${endpoint.name}`);
      console.log(`URL: ${endpoint.url}`);
      
      const response = await axios.get(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      console.log(`✅ SUCCESS: ${endpoint.name} returned ${response.status}`);
      console.log('Response data:', JSON.stringify(response.data, null, 2));
      
      // Process the response if it contains status data
      if (response.data && response.data.Data) {
        console.log('\n🔔 EXTRACTED STATUS INFORMATION:');
        
        const data = response.data.Data;
        
        // Check if we have a single object or an array
        if (Array.isArray(data)) {
          // Find STN1 in the array
          const unitData = data.find(item => 
            item.Name === UNIT_NAME || 
            item.UnitName === UNIT_NAME || 
            item.UnitId === UNIT_ID ||
            item.Id === UNIT_ID
          );
          
          if (unitData) {
            processUnitData(unitData, 'Array Item');
          } else {
            console.log(`  Could not find ${UNIT_NAME} in the response array`);
          }
        } else {
          // Process the single object
          processUnitData(data, 'Object');
        }
      }
    } catch (error) {
      console.error(`❌ ERROR with ${endpoint.name}: ${error.message}`);
      if (error.response) {
        console.error(`  Status code: ${error.response.status}`);
        if (error.response.data) {
          console.error(`  Response data:`, error.response.data);
        }
      }
    }
  }
}

function processUnitData(data, source) {
  console.log(`  Source: ${source}`);
  
  // Look for status-related properties
  const statusFields = [
    'StatusId', 'Status', 'StateId', 'State', 
    'Timestamp', 'UnitStatusId', 'UnitStatus'
  ];
  
  for (const field of statusFields) {
    if (data[field] !== undefined) {
      console.log(`  ${field}: ${data[field]}`);
    }
  }
  
  // Try to map the status ID if found
  if (data.StatusId !== undefined) {
    mapStatusId(data.StatusId);
  } else if (data.UnitStatusId !== undefined) {
    mapStatusId(data.UnitStatusId);
  }
  
  console.log();
}

function mapStatusId(statusId) {
  const statusNames = {
    2: 'Available',
    3: 'Committed/At Patient',
    5: 'En Route/Responding',
    6: 'On Scene', 
    8: 'Cleared',
    9: 'Returning'
  };
  
  if (statusNames[statusId]) {
    console.log(`  🔍 Mapped Status: StatusId ${statusId} = "${statusNames[statusId]}"`);
  } else {
    console.log(`  ⚠️ Unknown StatusId: ${statusId}`);
  }
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  await tryMultipleEndpoints(token);
  console.log('\nTest complete');
}

main().catch(console.error);