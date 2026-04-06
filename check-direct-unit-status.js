/**
 * Check unit status using the direct GetAllUnits endpoint
 * This is a more reliable method to get current unit status than the UnitStatus endpoints
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

async function getUnitStatus(token) {
  try {
    console.log(`Checking status for all units...`);
    
    // Use the working GetAllUnits endpoint
    const url = 'https://api.resgrid.com/api/v4/Units/GetAllUnits';
    
    console.log(`Using endpoint: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log(`Got response with status: ${response.status}`);
    
    if (response.data && response.data.Data) {
      const units = response.data.Data;
      console.log(`Found ${units.length} units in the system`);
      
      // Find the specific unit we're looking for
      const unit = units.find(u => u.Name === UNIT_NAME);
      
      if (unit) {
        console.log('\n🔔 UNIT DETAILS:');
        console.log(`  Unit Name: ${unit.Name}`);
        console.log(`  Unit ID: ${unit.UnitId}`);
        console.log(`  Type: ${unit.Type}`);
        console.log(`  Current Status ID: ${unit.CurrentStatusId}`);
        console.log(`  Status Timestamp: ${unit.CurrentStatusTimestamp}`);
        
        // Map status code to known names using the official codes
        const statusNames = {
          0: 'Available',
          3: 'Committed',
          4: 'Out of Service',
          5: 'Responding',
          6: 'On Scene',
          7: 'Staging',
          8: 'Returning'
        };
        
        if (statusNames[unit.CurrentStatusId]) {
          console.log(`  🔍 Status Name: ${statusNames[unit.CurrentStatusId]}`);
        } else {
          console.log(`  ⚠️ Unknown Status ID: ${unit.CurrentStatusId}`);
        }
        
        // Extra info
        if (unit.Note) {
          console.log(`  Note: ${unit.Note}`);
        }
        
        console.log('\n-- Direct Status from Unit --');
        console.log('This status is considered more reliable than trying to find the unit in call activities');
        console.log(`Unit ${UNIT_NAME} is currently: ${statusNames[unit.CurrentStatusId] || 'Unknown'} (StatusId: ${unit.CurrentStatusId})`);
        console.log(`Last status change: ${new Date(unit.CurrentStatusTimestamp).toLocaleString()}`);
      } else {
        console.log(`❌ Could not find unit with name ${UNIT_NAME}`);
      }
      
      // Also display a table of all units and their status
      console.log('\n🔔 ALL UNITS STATUS:');
      
      // Define status names again for this scope
      const statusNames = {
        0: 'Available',
        3: 'Committed',
        4: 'Out of Service',
        5: 'Responding',
        6: 'On Scene',
        7: 'Staging',
        8: 'Returning'
      };
      
      // Create a simplified list of units for display
      const unitStatuses = units.map(u => ({
        Name: u.Name,
        Type: u.Type,
        StatusId: u.CurrentStatusId,
        Status: statusNames[u.CurrentStatusId] || 'Unknown',
        LastUpdated: new Date(u.CurrentStatusTimestamp).toLocaleString()
      }));
      
      console.table(unitStatuses);
    } else {
      console.log('No unit data found or unexpected response format');
    }
  } catch (error) {
    console.error(`Error checking unit status: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      if (error.response.data) {
        console.error(`Response data:`, error.response.data);
      }
    }
  }
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  await getUnitStatus(token);
  console.log('Test complete');
}

main().catch(console.error);