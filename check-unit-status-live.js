/**
 * Live STN1 Status Monitoring Script
 * 
 * This script continuously monitors the status of the STN1 unit
 * and helps verify status code/text mappings in Resgrid.
 * 
 * Status Codes (from observations):
 * 5 = En Route / Responding
 * 6 = On Scene
 * 3 = Committed / At Patient
 * 9 = Returning
 * 2 = Available
 */
require('dotenv').config();
const axios = require('axios');

// Unit to monitor
const UNIT_TO_MONITOR = 'STN1';

// How frequently to check status (in milliseconds)
const CHECK_INTERVAL = 5000;

// Tracking status changes
let lastStatusId = null;
let lastStatusText = null;
let statusLog = [];

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
  
  if (!username || !password) {
    throw new Error('Missing Resgrid credentials in environment variables');
  }
  
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
 * Fetch active calls to find STN1 status
 */
async function findSTN1InActiveCalls(token) {
  try {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      return null;
    }
    
    const calls = response.data.Data;
    
    // Process each call until we find STN1
    for (const call of calls) {
      try {
        const extraData = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${call.CallId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (!extraData.data || !extraData.data.Data) {
          continue;
        }
        
        const callData = extraData.data.Data;
        
        // Look for STN1 in activity
        if (callData.Activity && Array.isArray(callData.Activity)) {
          for (const activity of callData.Activity) {
            if (activity.Name === UNIT_TO_MONITOR) {
              // We found STN1
              return {
                callId: call.CallId,
                callName: call.Name,
                statusId: activity.StatusId,
                statusText: activity.StatusText || 'Unknown',
                timestamp: activity.Timestamp
              };
            }
          }
        }
        
        // Look for STN1 in dispatches
        if (callData.Dispatches && Array.isArray(callData.Dispatches)) {
          for (const dispatch of callData.Dispatches) {
            if (dispatch.Name === UNIT_TO_MONITOR) {
              // We found STN1
              return {
                callId: call.CallId,
                callName: call.Name,
                statusId: dispatch.StatusId,
                statusText: dispatch.StatusText || 'Unknown',
                timestamp: dispatch.Timestamp
              };
            }
          }
        }
      } catch (error) {
        log(`Error fetching call ${call.CallId}: ${error.message}`, true);
      }
    }
    
    return null;
  } catch (error) {
    log(`Error fetching active calls: ${error.message}`, true);
    return null;
  }
}

/**
 * Start continuous monitoring 
 */
async function monitorSTN1Status() {
  try {
    const token = await getApiToken();
    
    log(`🔍 Starting continuous monitoring of ${UNIT_TO_MONITOR} status...`);
    log(`⏱️  Checking every ${CHECK_INTERVAL / 1000} seconds...`);
    log('Change the unit status in Resgrid and this script will detect the change.');
    log('-----------------------------------------------------------');
    
    // Run continuous monitoring loop
    setInterval(async () => {
      try {
        const status = await findSTN1InActiveCalls(token);
        
        if (status) {
          // Only log if the status has changed
          if (status.statusId !== lastStatusId || status.statusText !== lastStatusText) {
            const changeMsg = lastStatusId !== null 
              ? `STATUS CHANGE DETECTED: ${UNIT_TO_MONITOR} changed from StatusId=${lastStatusId} ("${lastStatusText}") to StatusId=${status.statusId} ("${status.statusText}")`
              : `INITIAL STATUS: ${UNIT_TO_MONITOR} has StatusId=${status.statusId} ("${status.statusText}")`;
            
            log(changeMsg);
            log(`Call: ${status.callName} (ID: ${status.callId})`);
            log(`Timestamp: ${status.timestamp}`);
            log('-----------------------------------------------------------');
            
            // Record status change
            statusLog.push({
              timestamp: new Date().toISOString(),
              statusId: status.statusId,
              statusText: status.statusText,
              callId: status.callId
            });
            
            // Update last status
            lastStatusId = status.statusId;
            lastStatusText = status.statusText;
          }
        } else if (lastStatusId !== null) {
          // If we previously had a status but now don't, the unit may have been cleared
          log(`${UNIT_TO_MONITOR} not found in any active calls. May have been cleared or is not on a call.`);
          log('-----------------------------------------------------------');
          
          lastStatusId = null;
          lastStatusText = null;
        }
      } catch (error) {
        log(`Error in monitoring loop: ${error.message}`, true);
      }
    }, CHECK_INTERVAL);
    
    // Print summary on exit
    process.on('SIGINT', () => {
      log('Monitoring stopped, printing status log:');
      
      if (statusLog.length === 0) {
        log('No status changes were detected.');
      } else {
        log('STATUS CHANGE HISTORY:');
        statusLog.forEach((entry, i) => {
          log(`[${i+1}] ${entry.timestamp} - StatusId=${entry.statusId}, StatusText="${entry.statusText}", Call=${entry.callId}`);
        });
      }
      
      log('Exiting...');
      process.exit(0);
    });
  } catch (error) {
    log(`Monitoring failed: ${error.message}`, true);
  }
}

// Run the monitor
monitorSTN1Status().catch(console.error);