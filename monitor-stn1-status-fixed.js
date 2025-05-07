/**
 * Monitor STN1 Status - Fixed Version
 * 
 * This script monitors the status of the STN1 unit (unit ID 8826)
 * and logs updates. It uses the correct unit ID and endpoints.
 */
require('dotenv').config();
const axios = require('axios');

// Resgrid API configuration
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;
const API_BASE_URL = 'https://api.resgrid.com/api/v4';

// Status ID to text mapping
const STATUS_MAPPING = {
  0: 'Available',
  2: 'Available (Alt)',
  3: 'Committed/At Patient',
  4: 'Out of Service',
  5: 'Responding/En Route',
  6: 'On Scene',
  7: 'Staging',
  8: 'Returning'
};

// Color coding for status
const STATUS_COLORS = {
  0: '\x1b[32m', // Green for Available
  2: '\x1b[32m', // Green for Available
  3: '\x1b[33m', // Yellow for Committed
  4: '\x1b[31m', // Red for Out of Service
  5: '\x1b[36m', // Cyan for Responding
  6: '\x1b[35m', // Magenta for On Scene
  7: '\x1b[33m', // Yellow for Staging
  8: '\x1b[36m', // Cyan for Returning
};
const RESET_COLOR = '\x1b[0m';

// STN1 Unit ID
const STN1_UNIT_ID = '8826';

/**
 * Gets a Resgrid API token
 */
async function getApiToken() {
  try {
    const tokenResponse = await axios.post(
      `${API_BASE_URL}/Connect/token`,
      `grant_type=password&username=${encodeURIComponent(RESGRID_USER)}&password=${encodeURIComponent(RESGRID_PASS)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error('Error getting token:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Get STN1 status using the direct unit status endpoint
 */
async function getSTN1Status(token) {
  try {
    console.log(`Checking STN1 status (Unit ID: ${STN1_UNIT_ID})...`);
    
    // Try direct unit status endpoint
    const response = await axios.get(
      `${API_BASE_URL}/UnitStatus/GetUnitStatus?unitId=${STN1_UNIT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (response.data && response.data.Data) {
      return response.data.Data;
    }
    return null;
  } catch (error) {
    console.error(`Error checking STN1 status: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Check for STN1 in active calls
 */
async function findSTN1InActiveCalls(token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/Calls/GetActiveCalls`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No active calls found');
      return null;
    }
    
    const activeCalls = response.data.Data;
    console.log(`Found ${activeCalls.length} active calls`);
    
    // Look through each call for STN1
    for (const call of activeCalls) {
      console.log(`Checking call ${call.CallId}: ${call.Name}`);
      
      // Get extra call data to see activity information
      try {
        const extraResponse = await axios.get(
          `${API_BASE_URL}/Calls/GetCallExtraData?callId=${call.CallId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (extraResponse.data && extraResponse.data.Data) {
          const extraData = extraResponse.data.Data;
          
          // Check Activity array
          if (extraData.Activity && extraData.Activity.length > 0) {
            console.log(`  Call has ${extraData.Activity.length} activity entries`);
            
            // Find STN1 in activity
            const stn1Activities = extraData.Activity.filter(
              act => act.UnitId === STN1_UNIT_ID || act.UnitName === 'STN1'
            );
            
            if (stn1Activities.length > 0) {
              // Sort by timestamp for most recent
              stn1Activities.sort((a, b) => 
                new Date(b.Timestamp) - new Date(a.Timestamp)
              );
              
              // Return the most recent activity
              return {
                source: 'activity',
                callId: call.CallId,
                callName: call.Name,
                status: stn1Activities[0]
              };
            }
          }
          
          // Check Dispatches array
          if (extraData.Dispatches && extraData.Dispatches.length > 0) {
            console.log(`  Call has ${extraData.Dispatches.length} dispatch entries`);
            
            // Find STN1 in dispatches
            const stn1Dispatches = extraData.Dispatches.filter(
              disp => disp.UnitId === STN1_UNIT_ID || disp.UnitName === 'STN1'
            );
            
            if (stn1Dispatches.length > 0) {
              return {
                source: 'dispatch',
                callId: call.CallId,
                callName: call.Name,
                status: stn1Dispatches[0]
              };
            }
          }
        }
      } catch (error) {
        console.error(`Error checking call ${call.CallId}: ${error.message}`);
      }
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking active calls: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Get all unit infos to find STN1
 */
async function getAllUnitInfos(token) {
  try {
    const response = await axios.get(
      `${API_BASE_URL}/Units/GetAllUnitsInfos`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No unit infos found');
      return null;
    }
    
    const units = response.data.Data;
    
    // Find STN1 in unit infos
    const stn1Unit = units.find(
      unit => unit.UnitId === STN1_UNIT_ID || unit.Name === 'STN1'
    );
    
    if (stn1Unit) {
      return {
        source: 'unit_infos',
        unitId: stn1Unit.UnitId,
        unitName: stn1Unit.Name,
        status: {
          StatusId: stn1Unit.UnitStatusId,
          StatusText: stn1Unit.CurrentStatus
        }
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting unit infos: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Display STN1 status
 */
function displaySTN1Status(statusInfo) {
  if (!statusInfo) {
    console.log('\n❌ Could not determine STN1 status');
    return;
  }
  
  const statusId = statusInfo.status.StatusId || 0;
  const statusText = STATUS_MAPPING[statusId] || statusInfo.status.StatusText || 'Unknown';
  const color = STATUS_COLORS[statusId] || RESET_COLOR;
  
  console.log('\n========== STN1 STATUS ==========');
  console.log(`Source: ${statusInfo.source}`);
  
  if (statusInfo.callId) {
    console.log(`Call: ${statusInfo.callId} - ${statusInfo.callName}`);
  }
  
  console.log(`Status: ${color}${statusId} - ${statusText}${RESET_COLOR}`);
  
  if (statusInfo.status.Timestamp && statusInfo.status.Timestamp !== '0001-01-01T00:00:00') {
    const timestamp = new Date(statusInfo.status.Timestamp);
    console.log(`Timestamp: ${timestamp.toLocaleString()}`);
  }
  
  console.log('=================================\n');
}

/**
 * Run status check once
 */
async function checkStatusOnce() {
  console.log('Starting STN1 status check...');
  
  // Get API token
  console.log('Getting Resgrid API token...');
  const token = await getApiToken();
  console.log('Successfully obtained API token');
  
  // Try multiple methods to get STN1 status
  let statusInfo = await getSTN1Status(token);
  
  if (statusInfo) {
    displaySTN1Status({
      source: 'direct_status',
      status: statusInfo
    });
    return;
  }
  
  // Try finding in active calls
  statusInfo = await findSTN1InActiveCalls(token);
  
  if (statusInfo) {
    displaySTN1Status(statusInfo);
    return;
  }
  
  // Try all units info
  statusInfo = await getAllUnitInfos(token);
  
  if (statusInfo) {
    displaySTN1Status(statusInfo);
    return;
  }
  
  console.log('❌ Unable to determine STN1 status through any method');
}

/**
 * Run continuous monitoring
 */
async function monitorStatus() {
  console.log('Starting STN1 status monitoring...');
  console.log('Press Ctrl+C to stop monitoring\n');
  
  let previousStatusId = null;
  let token = await getApiToken();
  let tokenTime = Date.now();
  
  // Run forever
  while (true) {
    try {
      // Refresh token if more than 45 minutes old
      if (Date.now() - tokenTime > 45 * 60 * 1000) {
        console.log('Refreshing API token...');
        token = await getApiToken();
        tokenTime = Date.now();
      }
      
      // Try multiple methods to get STN1 status
      let statusInfo = await getSTN1Status(token);
      
      if (statusInfo) {
        statusInfo = {
          source: 'direct_status',
          status: statusInfo
        };
      } else {
        // Try finding in active calls
        statusInfo = await findSTN1InActiveCalls(token);
      }
      
      if (!statusInfo) {
        // Try all units info
        statusInfo = await getAllUnitInfos(token);
      }
      
      if (statusInfo) {
        const currentStatusId = statusInfo.status.StatusId || 0;
        
        // Display status when it changes or on first run
        if (previousStatusId === null || currentStatusId !== previousStatusId) {
          displaySTN1Status(statusInfo);
          previousStatusId = currentStatusId;
        }
      } else {
        console.log('❌ Unable to determine STN1 status');
        previousStatusId = null;
      }
      
      // Wait 30 seconds before checking again
      await new Promise(resolve => setTimeout(resolve, 30000));
    } catch (error) {
      console.error(`Error in monitoring loop: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
}

// Check if the script should run in monitor mode
const arg = process.argv[2];

if (arg === 'monitor') {
  monitorStatus();
} else {
  checkStatusOnce();
}