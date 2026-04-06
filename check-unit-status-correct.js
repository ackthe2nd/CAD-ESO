/**
 * Check Unit Status with Correct Unit ID
 * 
 * This script gets information about all units using the GetAllUnitsInfos endpoint
 * and then checks the status of the STN1 unit with the correct unit ID.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = 'https://api.resgrid.com/api/v4';
const CORRECT_STN1_UNIT_ID = '8826'; // Correct STN1 unit ID

// Status code to text mapping
const STATUS_MAPPING = {
  0: 'Available',
  2: 'Available (Alt)',
  3: 'Committed / At Patient',
  4: 'Out of Service',
  5: 'En Route / Responding',
  6: 'On Scene',
  7: 'Staging',
  8: 'Returning',
  9: 'Unknown (9)'
};

// Function to get API token
async function getApiToken() {
  try {
    console.log('Getting Resgrid API token...');
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
      console.log('Successfully obtained API token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`Failed to get API token: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  return null;
}

// Function to get all unit info
async function getAllUnitInfos(token) {
  try {
    console.log(`Getting information for all units...`);
    const url = `${BASE_URL}/Units/GetAllUnitsInfos`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Found ${response.data.Data.length} units`);
      
      // Log unit names and IDs
      console.log('\nUnit List:');
      response.data.Data.forEach(unit => {
        console.log(`- ${unit.Name} (ID: ${unit.UnitId})`);
      });
      
      return response.data.Data;
    }
  } catch (error) {
    console.error(`Error getting all unit infos: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  
  return [];
}

// Function to get unit status directly
async function getUnitStatus(token, unitId) {
  try {
    console.log(`\nChecking status for unit ID: ${unitId}`);
    const url = `${BASE_URL}/UnitStatus/GetUnitStatus?unitId=${unitId}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      const unitData = response.data.Data;
      return {
        unitId: unitData.UnitId,
        name: unitData.Name,
        state: unitData.State,
        stateId: unitData.StateId, // This might be undefined in some cases
        stateCss: unitData.StateCss,
        timestamp: unitData.Timestamp,
        note: unitData.Note,
        lat: unitData.Latitude,
        lng: unitData.Longitude
      };
    }
  } catch (error) {
    console.error(`Error getting unit status: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  
  return null;
}

// Function to get all unit status definitions
async function getStatusDefinitions(token) {
  try {
    console.log("\nGetting unit status definitions...");
    const response = await axios.get(`${BASE_URL}/Statuses/GetAllUnitStatuses`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      let statusMappings = [];
      
      for (const group of response.data.Data) {
        if (group.Statuses && Array.isArray(group.Statuses)) {
          for (const status of group.Statuses) {
            statusMappings.push({
              id: status.Id,
              text: status.Text,
              color: status.Color,
              bColor: status.BColor
            });
          }
        }
      }
      
      console.log(`Found ${statusMappings.length} status definitions`);
      return statusMappings;
    }
  } catch (error) {
    console.error(`Error getting status definitions: ${error.message}`);
  }
  
  return null;
}

// Main function to check unit status
async function checkUnitStatusCorrect() {
  // Get API token
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  // Get all unit information
  const units = await getAllUnitInfos(token);
  
  // Find STN1 unit
  const stn1Unit = units.find(unit => unit.Name === 'STN1');
  
  if (stn1Unit) {
    console.log(`\nFound STN1 with ID: ${stn1Unit.UnitId}`);
    console.log(`Department ID: ${stn1Unit.DepartmentId}`);
    console.log(`Current Status: ${stn1Unit.CurrentStatus}`);
    console.log(`Current Status ID: ${stn1Unit.CurrentStatusId}`);
    console.log(`Status Timestamp: ${stn1Unit.CurrentStatusTimestamp}`);
  }
  
  // Get status definitions
  const statusDefinitions = await getStatusDefinitions(token);
  
  // Check status using the correct unit ID
  const unitStatus = await getUnitStatus(token, CORRECT_STN1_UNIT_ID);
  
  console.log("\n=== STN1 UNIT STATUS REPORT ===\n");
  
  if (unitStatus) {
    console.log(`Unit Name: ${unitStatus.name}`);
    console.log(`Unit ID: ${unitStatus.unitId}`);
    console.log(`Current State: ${unitStatus.state}`);
    
    // Try to determine status ID
    let statusId = unitStatus.stateId;
    if (statusId === undefined && statusDefinitions) {
      // Try to match by text
      const matchingStatus = statusDefinitions.find(s => s.text === unitStatus.state);
      if (matchingStatus) {
        statusId = matchingStatus.id;
      }
    }
    
    if (statusId !== undefined) {
      console.log(`Status ID: ${statusId}`);
      console.log(`Status Text: ${STATUS_MAPPING[statusId] || unitStatus.state}`);
    } else {
      console.log(`Status ID: Unknown`);
    }
    
    console.log(`Timestamp: ${unitStatus.timestamp}`);
    
    if (unitStatus.lat && unitStatus.lng) {
      console.log(`Location: ${unitStatus.lat}, ${unitStatus.lng}`);
    }
    
    if (unitStatus.note) {
      console.log(`Note: ${unitStatus.note}`);
    }
  } else {
    console.log("❌ Could not get status information for STN1 using ID: " + CORRECT_STN1_UNIT_ID);
  }
  
  // Show status definitions for reference
  if (statusDefinitions) {
    console.log("\n=== STATUS CODE REFERENCE ===\n");
    console.log("| StatusId | Text | Color |");
    console.log("|----------|------|-------|");
    
    statusDefinitions.forEach(status => {
      console.log(`| ${status.id} | ${status.text} | ${status.color} |`);
    });
  }
}

// Run the check
checkUnitStatusCorrect().catch(console.error);