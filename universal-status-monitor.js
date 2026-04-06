/**
 * Universal Status Monitor for STN1
 * 
 * This script will monitor STN1's status across all calls and endpoints,
 * reporting any changes in real-time.
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const UNIT_TO_MONITOR = 'STN1';
const CHECK_INTERVAL = 3000; // Check every 3 seconds
const MAX_CHECKS = 10000; // Prevent infinite running
const DEBUG_MODE = false; // Set to true for more verbose logging

// Tracking data
let checkCount = 0;
let lastActivities = [];
let lastActiveCallIds = [];
let lastStatusMapping = {};

function log(message, isError = false, isDebug = false) {
  if (isDebug && !DEBUG_MODE) return;
  
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : isDebug ? '🔍 DEBUG' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  try {
    log('Getting Resgrid API token...');
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      log('Successfully obtained API token');
      return response.data.access_token;
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    log(`Failed to get API token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch active calls
 */
async function fetchActiveCalls(token) {
  try {
    log('Fetching active calls...', false, true);
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      log('No active calls found or unexpected response format', true);
      return [];
    }
    
    log(`Found ${response.data.Data.length} active calls`, false, true);
    return response.data.Data;
  } catch (error) {
    log(`Error fetching active calls: ${error.message}`, true);
    return [];
  }
}

/**
 * Fetch extra data for a specific call ID
 */
async function fetchCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`, false, true);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data) {
      log(`No extra data found for call ${callId} or unexpected response format`, true);
      return null;
    }
    
    log(`Successfully fetched extra data for call ${callId}`, false, true);
    return response.data.Data;
  } catch (error) {
    log(`Error fetching extra data for call ${callId}: ${error.message}`, true);
    return null;
  }
}

/**
 * Attempt to fetch unit status from all possible endpoints
 */
async function tryAllUnitStatusEndpoints(token) {
  const endpoints = [
    { name: 'GetAllUnitStatuses', url: 'https://api.resgrid.com/api/v4/Units/GetAllUnitStatuses' },
    { name: 'GetUnitsStatuses', url: 'https://api.resgrid.com/api/v4/Units/GetUnitsStatuses' },
    { name: 'GetPersonnelStatusByDepartment', url: 'https://api.resgrid.com/api/v4/Personnel/GetPersonnelStatusByDepartment' },
    { name: 'GetPersonnelStatusForDepartment', url: 'https://api.resgrid.com/api/v4/Personnel/GetPersonnelStatusForDepartment' }
  ];
  
  let foundStatus = false;
  
  for (const endpoint of endpoints) {
    try {
      log(`Trying endpoint: ${endpoint.name}...`, false, true);
      const response = await axios.get(endpoint.url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        },
        timeout: 5000
      });
      
      if (response.data && response.data.Data) {
        log(`Endpoint ${endpoint.name} returned data`, false, true);
        
        // Check if we have an array of personnel/units
        if (Array.isArray(response.data.Data)) {
          const records = response.data.Data;
          
          for (const record of records) {
            if (record.Name === UNIT_TO_MONITOR || 
                record.UnitName === UNIT_TO_MONITOR || 
                record.Identifier === UNIT_TO_MONITOR) {
              
              log(`✨ FOUND ${UNIT_TO_MONITOR} STATUS via ${endpoint.name}:`);
              log(`  StatusId: ${record.StatusId}`);
              log(`  Status: ${record.Status || 'Unknown'}`);
              if (record.StateId) log(`  StateId: ${record.StateId}`);
              if (record.State) log(`  State: ${record.State}`);
              log(`  Timestamp: ${record.Timestamp || 'Unknown'}`);
              
              foundStatus = true;
            }
          }
        }
      }
    } catch (error) {
      log(`Endpoint ${endpoint.name} error: ${error.message}`, false, true);
    }
  }
  
  if (!foundStatus) {
    log(`No ${UNIT_TO_MONITOR} status found in direct unit status endpoints`, false, true);
  }
}

/**
 * Get all activities for a unit across all active calls
 */
async function getAllUnitActivities(token, unitName) {
  // Get all active calls
  const calls = await fetchActiveCalls(token);
  if (!calls.length) {
    return { activities: [], callIds: [] };
  }
  
  // Track which call IDs we need to check
  const callIds = calls.map(call => call.CallId);
  
  // Collect all activities
  const activities = [];
  const callData = [];
  
  // Check each call for unit activities
  for (const call of calls) {
    const callExtra = await fetchCallExtraData(token, call.CallId);
    if (!callExtra) continue;
    
    // Store basic call info
    const basicCallInfo = {
      id: call.CallId,
      name: call.Name,
      callType: call.Type,
      priority: call.Priority,
      address: call.Address
    };
    
    // Check activity data for this unit
    if (callExtra.Activity && Array.isArray(callExtra.Activity)) {
      for (const activity of callExtra.Activity) {
        if (activity.Name === unitName) {
          activities.push({
            callId: call.CallId,
            callName: call.Name,
            type: 'Activity',
            statusId: activity.StatusId,
            statusText: activity.StatusText || 'Unknown',
            timestamp: activity.Timestamp,
            call: basicCallInfo
          });
        }
      }
    }
    
    // Check dispatches data for this unit
    if (callExtra.Dispatches && Array.isArray(callExtra.Dispatches)) {
      for (const dispatch of callExtra.Dispatches) {
        if (dispatch.Name === unitName) {
          activities.push({
            callId: call.CallId,
            callName: call.Name,
            type: 'Dispatch',
            statusId: dispatch.StatusId,
            statusText: dispatch.StatusText || 'Unknown',
            timestamp: dispatch.Timestamp,
            call: basicCallInfo
          });
        }
      }
    }
    
    // Add call data for reference
    callData.push(basicCallInfo);
  }
  
  return { activities, callIds };
}

/**
 * Check for new or changed activities
 */
function detectChanges(activities, prevActivities) {
  if (!prevActivities.length) return [];
  
  return activities.filter(current => {
    // Check if this is a new activity that wasn't in the previous set
    return !prevActivities.some(prev => 
      prev.callId === current.callId && 
      prev.statusId === current.statusId && 
      prev.timestamp === current.timestamp
    );
  });
}

/**
 * Get the mapping between StatusId and status names
 */
function getStatusMapping() {
  return {
    2: 'Available',
    3: 'Committed/At Patient',
    5: 'En Route/Responding',
    6: 'On Scene',
    8: 'Cleared',
    9: 'Returning'
  };
}

/**
 * Start monitoring
 */
async function startMonitoring() {
  try {
    log(`Starting universal status monitor for ${UNIT_TO_MONITOR}`);
    log(`Checking every ${CHECK_INTERVAL / 1000} seconds...`);
    log('=====================================================');
    
    const token = await getApiToken();
    const statusMapping = getStatusMapping();
    
    // Get initial status
    log(`Getting initial status for ${UNIT_TO_MONITOR}...`);
    const { activities, callIds } = await getAllUnitActivities(token, UNIT_TO_MONITOR);
    
    // Display initial status
    if (activities.length) {
      log(`Found ${activities.length} activities for ${UNIT_TO_MONITOR} across ${new Set(activities.map(a => a.callId)).size} calls`);
      
      // Sort by timestamp (newest first)
      const sortedActivities = [...activities].sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      log('INITIAL STATUS:');
      for (const activity of sortedActivities.slice(0, 5)) { // Show just the 5 most recent
        const statusName = statusMapping[activity.statusId] || 'Unknown';
        log(`  [${activity.callName}] StatusId ${activity.statusId} (${statusName}) at ${activity.timestamp}`);
      }
    } else {
      log(`No activities found for ${UNIT_TO_MONITOR}`);
    }
    
    // Try direct unit status endpoints
    await tryAllUnitStatusEndpoints(token);
    
    log('Monitoring for status changes...');
    log('=====================================================');
    
    // Track state
    lastActivities = activities;
    lastActiveCallIds = callIds;
    
    // Start monitoring loop
    const intervalId = setInterval(async () => {
      try {
        checkCount++;
        if (checkCount > MAX_CHECKS) {
          clearInterval(intervalId);
          log(`Reached maximum check count (${MAX_CHECKS}). Stopping monitor.`);
          return;
        }
        
        // Get current status
        const result = await getAllUnitActivities(token, UNIT_TO_MONITOR);
        const currentActivities = result.activities;
        const currentCallIds = result.callIds;
        
        // Check for different call IDs (new calls or closed calls)
        const newCallIds = currentCallIds.filter(id => !lastActiveCallIds.includes(id));
        const closedCallIds = lastActiveCallIds.filter(id => !currentCallIds.includes(id));
        
        if (newCallIds.length) {
          log(`📞 NEW CALLS DETECTED: ${newCallIds.join(', ')}`);
        }
        
        if (closedCallIds.length) {
          log(`🏁 CALLS CLOSED: ${closedCallIds.join(', ')}`);
        }
        
        // Check for status changes
        const newActivities = detectChanges(currentActivities, lastActivities);
        
        if (newActivities.length) {
          log(`⚡ STATUS CHANGE DETECTED: ${newActivities.length} new activities`);
          
          for (const activity of newActivities) {
            const statusName = statusMapping[activity.statusId] || 'Unknown';
            log(`  [${activity.callName}] New StatusId ${activity.statusId} (${statusName}) at ${activity.timestamp}`);
            
            // Special highlights for specific status IDs
            if (activity.statusId === 9) {
              log(`  ✨✨✨ RETURNING STATUS FOUND (StatusId 9) ✨✨✨`);
            } else if (activity.statusId === 8) {
              log(`  ✨✨✨ CLEARED STATUS FOUND (StatusId 8) ✨✨✨`);
            } else if (activity.statusId === 2) {
              log(`  ✨✨✨ AVAILABLE STATUS FOUND (StatusId 2) ✨✨✨`);
            }
          }
          
          // Update last activities
          lastActivities = currentActivities;
        }
        
        // Update call IDs
        lastActiveCallIds = currentCallIds;
        
        // Every 30 seconds, try the direct unit status endpoints
        if (checkCount % 10 === 0) {
          await tryAllUnitStatusEndpoints(token);
        }
      } catch (error) {
        log(`Error in monitoring loop: ${error.message}`, true);
      }
    }, CHECK_INTERVAL);
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      clearInterval(intervalId);
      log('Monitoring stopped. Final status:');
      
      if (lastActivities.length) {
        // Sort by timestamp (newest first)
        const sortedActivities = [...lastActivities].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        
        for (const activity of sortedActivities.slice(0, 5)) {
          const statusName = statusMapping[activity.statusId] || 'Unknown';
          log(`  [${activity.callName}] StatusId ${activity.statusId} (${statusName}) at ${activity.timestamp}`);
        }
      } else {
        log(`  No final activities found for ${UNIT_TO_MONITOR}`);
      }
      
      process.exit(0);
    });
  } catch (error) {
    log(`Fatal error: ${error.message}`, true);
  }
}

// Start monitoring
startMonitoring().catch(error => {
  log(`Startup error: ${error.message}`, true);
  process.exit(1);
});