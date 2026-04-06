/**
 * Monitor a single active call for status changes
 * Especially looking for "Returning" (StatusId 9) status
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const CALL_ID = '198414'; // The call ID to monitor 
const UNIT_TO_MONITOR = 'STN1';
const CHECK_INTERVAL = 3000; // Check every 3 seconds

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
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
 * Check a specific call for any status changes
 */
async function checkCallStatus(token, callId) {
  try {
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data) {
      log(`No data found for call ${callId}`, true);
      return [];
    }
    
    const callData = response.data.Data;
    
    // Extract STN1 activities
    const activities = [];
    
    if (callData.Activity && Array.isArray(callData.Activity)) {
      for (const activity of callData.Activity) {
        if (activity.Name === UNIT_TO_MONITOR) {
          activities.push({
            type: 'Activity',
            statusId: activity.StatusId,
            statusText: activity.StatusText || 'Unknown',
            timestamp: activity.Timestamp
          });
        }
      }
    }
    
    return activities;
  } catch (error) {
    log(`Error checking call ${callId}: ${error.message}`, true);
    return [];
  }
}

/**
 * Start monitoring loop
 */
async function startMonitoring() {
  log(`Starting monitoring of call ${CALL_ID} for unit ${UNIT_TO_MONITOR}`);
  log(`Looking especially for "Returning" status (StatusId 9)`);
  log(`Checking every ${CHECK_INTERVAL / 1000} seconds...`);
  log('-----------------------------------------------------------');
  
  const token = await getApiToken();
  
  // Get initial status
  let lastActivities = await checkCallStatus(token, CALL_ID);
  let lastStatusIds = new Set(lastActivities.map(a => a.statusId));
  
  log(`Initial check: Found ${lastActivities.length} activities for ${UNIT_TO_MONITOR}`);
  for (const activity of lastActivities) {
    log(`  StatusId ${activity.statusId} at ${activity.timestamp}`);
  }
  log('Monitoring for changes...');
  log('-----------------------------------------------------------');
  
  // Start monitoring loop
  setInterval(async () => {
    try {
      const currentActivities = await checkCallStatus(token, CALL_ID);
      const currentStatusIds = new Set(currentActivities.map(a => a.statusId));
      
      // Check for new status IDs
      const hasNewStatus = currentActivities.some(cur => !lastActivities.some(last => 
        last.statusId === cur.statusId && last.timestamp === cur.timestamp));
      
      if (hasNewStatus) {
        log(`🔔 STATUS CHANGE DETECTED IN CALL ${CALL_ID}`);
        log(`Previous status count: ${lastActivities.length}`);
        log(`Current status count: ${currentActivities.length}`);
        
        // Find the new or changed activities
        for (const cur of currentActivities) {
          const isNew = !lastActivities.some(last => 
            last.statusId === cur.statusId && last.timestamp === cur.timestamp);
          
          if (isNew) {
            log(`➕ NEW STATUS: StatusId ${cur.statusId} at ${cur.timestamp}`);
            
            // Highlight if this is the Returning status
            if (cur.statusId === 9) {
              log(`✨✨✨ RETURNING STATUS FOUND (StatusId 9) ✨✨✨`);
            }
          }
        }
        
        log('Full current status list:');
        for (const activity of currentActivities) {
          log(`  StatusId ${activity.statusId} at ${activity.timestamp}`);
        }
        log('-----------------------------------------------------------');
        
        // Update last status
        lastActivities = currentActivities;
        lastStatusIds = currentStatusIds;
      }
    } catch (error) {
      log(`Error in monitoring loop: ${error.message}`, true);
    }
  }, CHECK_INTERVAL);
}

// Start the monitoring
startMonitoring().catch(err => {
  log(`Fatal error: ${err.message}`, true);
  process.exit(1);
});