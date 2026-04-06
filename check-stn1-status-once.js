/**
 * Check STN1 Status - One-time Check
 * 
 * This script checks the current status of the STN1 unit once 
 * and displays the status code and text.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = 'https://api.resgrid.com/api/v4';
const STN1_UNIT_ID = '8824'; // STN1 unit ID

// Status code to text mapping
const STATUS_MAPPING = {
  0: 'Available',
  2: 'Available (Alt)',
  3: 'Committed / At Patient',
  4: 'Out of Service',
  5: 'En Route / Responding',
  6: 'On Scene',
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

// Function to get STN1 status directly
async function getSTN1Status(token) {
  try {
    console.log(`Checking status for unit ID: ${STN1_UNIT_ID} (STN1)...`);
    const url = `${BASE_URL}/UnitStatus/GetUnitStatus?unitId=${STN1_UNIT_ID}`;
    
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
    console.error(`Error getting STN1 status: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  
  return null;
}

// Function to find STN1 in active calls
async function findSTN1InActiveCalls(token) {
  try {
    console.log("Looking for STN1 in active calls...");
    const response = await axios.get(`${BASE_URL}/Calls/GetActiveCalls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Found ${response.data.Data.length} active calls`);
      
      for (const call of response.data.Data) {
        console.log(`Checking call ${call.CallId}: ${call.Name}`);
        
        // Get call extra data to check for STN1 activities
        const extraDataResponse = await axios.get(`${BASE_URL}/Calls/GetCallExtraData?callId=${call.CallId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (extraDataResponse.data && extraDataResponse.data.Data) {
          const extraData = extraDataResponse.data.Data;
          
          // Check Activities array for STN1
          if (extraData.Activity && Array.isArray(extraData.Activity)) {
            const stn1Activities = extraData.Activity.filter(a => 
              a.ResourceName && a.ResourceName.includes('STN1')
            );
            
            if (stn1Activities.length > 0) {
              // Sort activities by timestamp (newest first)
              stn1Activities.sort((a, b) => 
                new Date(b.Timestamp) - new Date(a.Timestamp)
              );
              
              const latestActivity = stn1Activities[0];
              console.log(`  Found STN1 in activities:`);
              console.log(`  Latest activity: StatusId ${latestActivity.StatusId} at ${latestActivity.Timestamp}`);
              
              // Look up status text
              const statusText = STATUS_MAPPING[latestActivity.StatusId] || `Unknown (${latestActivity.StatusId})`;
              
              return {
                callId: call.CallId,
                callName: call.Name,
                statusId: latestActivity.StatusId,
                statusText: statusText,
                timestamp: latestActivity.Timestamp,
                source: 'activity'
              };
            }
          }
          
          // Check Dispatches array for STN1
          if (extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
            const stn1Dispatches = extraData.Dispatches.filter(d => 
              d.ResourceName && d.ResourceName.includes('STN1')
            );
            
            if (stn1Dispatches.length > 0) {
              console.log(`  Found STN1 in dispatches`);
              // We don't return this as it's less reliable for status
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error checking active calls: ${error.message}`);
  }
  
  return null;
}

// Function to get all unit status definitions
async function getStatusDefinitions(token) {
  try {
    console.log("Getting unit status definitions...");
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

// Main function to check STN1 status
async function checkSTN1Status() {
  // Get API token
  const token = await getApiToken();
  if (!token) {
    console.error('Could not obtain API token');
    return;
  }
  
  // Try to get status definitions
  const statusDefinitions = await getStatusDefinitions(token);
  
  // First try direct status
  const directStatus = await getSTN1Status(token);
  
  console.log("\n=== STN1 STATUS REPORT ===\n");
  
  if (directStatus) {
    console.log(`🚑 STN1 - ${directStatus.name}`);
    console.log(`Current State: ${directStatus.state}`);
    
    // Try to determine status ID
    let statusId = directStatus.stateId;
    if (statusId === undefined && statusDefinitions) {
      // Try to match by text
      const matchingStatus = statusDefinitions.find(s => s.text === directStatus.state);
      if (matchingStatus) {
        statusId = matchingStatus.id;
      }
    }
    
    if (statusId !== undefined) {
      console.log(`Status ID: ${statusId}`);
      console.log(`Status Text: ${STATUS_MAPPING[statusId] || directStatus.state}`);
    } else {
      console.log(`Status ID: Unknown`);
    }
    
    console.log(`Timestamp: ${directStatus.timestamp}`);
    
    if (directStatus.lat && directStatus.lng) {
      console.log(`Location: ${directStatus.lat}, ${directStatus.lng}`);
    }
    
    if (directStatus.note) {
      console.log(`Note: ${directStatus.note}`);
    }
  } else {
    console.log("❌ Could not get direct status information for STN1");
    
    // Try to find in active calls
    const callStatus = await findSTN1InActiveCalls(token);
    
    if (callStatus) {
      console.log(`🚑 STN1 found in call: ${callStatus.callId} - ${callStatus.callName}`);
      console.log(`Status ID: ${callStatus.statusId}`);
      console.log(`Status Text: ${callStatus.statusText}`);
      console.log(`Timestamp: ${callStatus.timestamp}`);
    } else {
      console.log("❌ Could not find STN1 in any active calls");
    }
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
checkSTN1Status().catch(console.error);