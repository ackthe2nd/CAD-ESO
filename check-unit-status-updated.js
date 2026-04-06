/**
 * Testing Unit Status Endpoints with Updated URLs
 * 
 * This script focuses on testing the unit status endpoints with the correct paths
 */
require('dotenv').config();
const axios = require('axios');

// Base URL for all endpoints
const BASE_URL = 'https://api.resgrid.com/api/v4';

// Sample unit IDs for testing
const unitIds = [
  // Known working unit IDs
  '8826',  // CMD11 unit ID
  '8824'   // STN1 unit ID
];

// Function to get API token
async function getApiToken() {
  try {
    console.log('🔑 Getting Resgrid API token...');
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const response = await axios.post(`${BASE_URL}/Connect/token`, 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('✅ Successfully obtained API token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`❌ Failed to get API token: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  return null;
}

// Function to test UnitStatus/GetUnitStatus with a specific unitId
async function testUnitStatusById(token, unitId) {
  try {
    console.log(`\n📡 Testing: UnitStatus/GetUnitStatus with unitId=${unitId}`);
    const url = `${BASE_URL}/UnitStatus/GetUnitStatus?unitId=${unitId}`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    if (response.data && response.data.Data) {
      const unitData = response.data.Data;
      console.log(`Unit Name: ${unitData.Name}`);
      console.log(`Current Status: ${unitData.State} (StatusId: ${unitData.StateId || 'Unknown'})`);
      console.log(`Status Timestamp: ${unitData.Timestamp}`);
      console.log(`Coordinates: ${unitData.Latitude}, ${unitData.Longitude}`);
      
      // Return the data for further analysis
      return {
        unitId,
        status: 'success',
        data: unitData
      };
    } else {
      console.log(`  Response data structure is different than expected`);
      return {
        unitId,
        status: 'partial',
        data: response.data
      };
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      
      if (error.response.data) {
        console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
    }
    
    return {
      unitId,
      status: 'error',
      error: error.message,
      statusCode: error.response ? error.response.status : 0
    };
  }
}

// Function to test UnitStatus/GetAllUnitStatuses
async function testGetAllUnitStatuses(token) {
  try {
    console.log(`\n📡 Testing: UnitStatus/GetAllUnitStatuses`);
    const url = `${BASE_URL}/UnitStatus/GetAllUnitStatuses`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 10000 // Longer timeout for this endpoint as it might be slower
    });
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Returned ${response.data.Data.length} unit statuses`);
      
      // Display sample data
      if (response.data.Data.length > 0) {
        const sample = response.data.Data[0];
        console.log(`Sample Unit Data:`);
        console.log(`  UnitId: ${sample.UnitId}`);
        console.log(`  Name: ${sample.Name}`);
        console.log(`  State: ${sample.State}`);
        console.log(`  Timestamp: ${sample.Timestamp}`);
      }
      
      return {
        status: 'success',
        count: response.data.Data.length,
        data: response.data.Data
      };
    } else {
      console.log(`Response data structure is different than expected`);
      return {
        status: 'partial',
        data: response.data
      };
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      
      if (error.response.data) {
        console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
    }
    
    return {
      status: 'error',
      error: error.message,
      statusCode: error.response ? error.response.status : 0
    };
  }
}

// Function to test Units/GetAllUnits (which also contains status information)
async function testGetAllUnits(token) {
  try {
    console.log(`\n📡 Testing: Units/GetAllUnits`);
    const url = `${BASE_URL}/Units/GetAllUnits`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Returned ${response.data.Data.length} units`);
      
      // Display sample data
      if (response.data.Data.length > 0) {
        const sample = response.data.Data[0];
        console.log(`Sample Unit Data:`);
        console.log(`  UnitId: ${sample.UnitId}`);
        console.log(`  Name: ${sample.Name}`);
        console.log(`  Current Status ID: ${sample.CurrentStatusId}`);
        console.log(`  Status Timestamp: ${sample.CurrentStatusTimestamp}`);
      }
      
      return {
        status: 'success',
        count: response.data.Data.length,
        data: response.data.Data
      };
    } else {
      console.log(`Response data structure is different than expected`);
      return {
        status: 'partial',
        data: response.data
      };
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      
      if (error.response.data) {
        console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
    }
    
    return {
      status: 'error',
      error: error.message,
      statusCode: error.response ? error.response.status : 0
    };
  }
}

// Function to test status definitions endpoint
async function testGetAllUnitStatusDefinitions(token) {
  try {
    console.log(`\n📡 Testing: Statuses/GetAllUnitStatuses (status definitions)`);
    const url = `${BASE_URL}/Statuses/GetAllUnitStatuses`;
    console.log(`URL: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      timeout: 5000
    });
    
    console.log(`✅ SUCCESS: Status ${response.status}`);
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Returned ${response.data.Data.length} status definition groups`);
      
      // If we have status definitions, display them all with the mapping
      let statusMappings = [];
      
      for (const group of response.data.Data) {
        if (group.Statuses && Array.isArray(group.Statuses)) {
          for (const status of group.Statuses) {
            statusMappings.push({
              id: status.Id,
              text: status.Text,
              color: status.Color,
              backgroundColor: status.BColor
            });
          }
        }
      }
      
      console.log(`Found ${statusMappings.length} status definitions:`);
      statusMappings.forEach(status => {
        console.log(`  StatusId ${status.id}: ${status.text} (Color: ${status.color}, BG: ${status.backgroundColor})`);
      });
      
      return {
        status: 'success',
        definitions: statusMappings
      };
    } else {
      console.log(`Response data structure is different than expected`);
      return {
        status: 'partial',
        data: response.data
      };
    }
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      
      if (error.response.data) {
        console.error(`Response data: ${JSON.stringify(error.response.data).substring(0, 200)}`);
      }
    }
    
    return {
      status: 'error',
      error: error.message,
      statusCode: error.response ? error.response.status : 0
    };
  }
}

// Main function to run all the tests
async function testUnitStatusEndpoints() {
  const token = await getApiToken();
  if (!token) {
    console.error('⛔ Could not obtain API token, aborting tests');
    return;
  }
  
  // Test individual unit status lookups
  const unitResults = [];
  for (const unitId of unitIds) {
    const result = await testUnitStatusById(token, unitId);
    unitResults.push(result);
  }
  
  // Test bulk unit status endpoints
  const allUnitStatusesResult = await testGetAllUnitStatuses(token);
  const allUnitsResult = await testGetAllUnits(token);
  
  // Test status definitions
  const statusDefinitionsResult = await testGetAllUnitStatusDefinitions(token);
  
  // Print a summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('Unit Status Tests:');
  unitResults.forEach(result => {
    if (result.status === 'success') {
      console.log(`  ✅ Unit ${result.unitId}: ${result.data.Name} - Status: ${result.data.State}`);
    } else {
      console.log(`  ❌ Unit ${result.unitId}: ${result.status}`);
    }
  });
  
  console.log(`\nBulk Endpoints:`);
  console.log(`  GetAllUnitStatuses: ${allUnitStatusesResult.status === 'success' ? '✅ Success' : '❌ Failed'}`);
  console.log(`  GetAllUnits: ${allUnitsResult.status === 'success' ? '✅ Success' : '❌ Failed'}`);
  
  console.log(`\nStatus Definitions:`);
  console.log(`  ${statusDefinitionsResult.status === 'success' ? '✅ Success' : '❌ Failed'}`);
  
  if (statusDefinitionsResult.status === 'success') {
    console.log('\n📋 Status Mapping Table for Integration:');
    console.log('| StatusId | Text | Description | Usage |');
    console.log('|----------|------|-------------|-------|');
    
    // Filter the most important statuses for integration
    const importantStatuses = [0, 2, 3, 5, 6, 8];
    
    for (const id of importantStatuses) {
      const status = statusDefinitionsResult.definitions.find(s => s.id === id);
      if (status) {
        let usage = '';
        switch (id) {
          case 0:
          case 2:
            usage = 'Back in Service (fallback)';
            break;
          case 3:
            usage = 'At Patient time';
            break;
          case 5:
            usage = 'En Route time';
            break;
          case 6:
            usage = 'Arrived on Scene time';
            break;
          case 8:
            usage = 'Back in Service time';
            break;
        }
        
        console.log(`| ${id} | ${status.text} | Unit status | ${usage} |`);
      }
    }
  }
  
  console.log('\n✅ Unit status testing completed');
}

// Run the tests
testUnitStatusEndpoints().catch(console.error);