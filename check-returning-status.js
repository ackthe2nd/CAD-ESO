/**
 * Check for returning status on STN1
 * This script will check active calls for any unit with a "returning" status
 */
require('dotenv').config();
const axios = require('axios');

// Unit to check
const UNIT_TO_CHECK = 'STN1';

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
 * Fetch active calls
 */
async function fetchActiveCalls(token) {
  try {
    log('Fetching active calls...');
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
    
    log(`Successfully fetched ${response.data.Data.length} active calls`);
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
    log(`Fetching extra data for call ${callId}...`);
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
    
    log(`Successfully fetched extra data for call ${callId}`);
    return response.data.Data;
  } catch (error) {
    log(`Error fetching extra data for call ${callId}: ${error.message}`, true);
    return null;
  }
}

/**
 * Check all active calls for any unit with returning status
 */
async function checkForReturningStatus(token) {
  try {
    const calls = await fetchActiveCalls(token);
    if (!calls.length) {
      log('No active calls to check');
      return;
    }
    
    log(`Checking ${calls.length} active calls for returning status...`);
    
    let foundReturning = false;
    
    for (const call of calls) {
      log(`\nChecking call ${call.CallId}: ${call.Name}`);
      
      const callData = await fetchCallExtraData(token, call.CallId);
      if (!callData) {
        continue;
      }
      
      // Check Activity entries for STN1 with any status
      if (callData.Activity && Array.isArray(callData.Activity)) {
        log(`  Call has ${callData.Activity.length} activity entries`);
        
        for (const activity of callData.Activity) {
          if (activity.Name === UNIT_TO_CHECK) {
            log(`🔔 FOUND ${UNIT_TO_CHECK} in activity array for call ${call.CallId}`);
            log(`  StatusId: ${activity.StatusId}`);
            log(`  StatusText: ${activity.StatusText || 'Unknown'}`);
            log(`  Timestamp: ${activity.Timestamp}`);
            
            // Check if this is a "returning" status (StatusId 9)
            if (activity.StatusId === 9) {
              log(`✨ RETURNING STATUS FOUND: ${UNIT_TO_CHECK} is returning (StatusId 9) on call ${call.CallId}`);
              foundReturning = true;
            }
          }
        }
      } else {
        log(`  Call has no activity entries`);
      }
      
      // Check Dispatches entries for STN1 with any status
      if (callData.Dispatches && Array.isArray(callData.Dispatches)) {
        log(`  Call has ${callData.Dispatches.length} dispatch entries`);
        
        for (const dispatch of callData.Dispatches) {
          if (dispatch.Name === UNIT_TO_CHECK) {
            log(`🔔 FOUND ${UNIT_TO_CHECK} in dispatches array for call ${call.CallId}`);
            log(`  StatusId: ${dispatch.StatusId}`);
            log(`  StatusText: ${dispatch.StatusText || 'Unknown'}`);
            log(`  Timestamp: ${dispatch.Timestamp}`);
            
            // Check if this is a "returning" status (StatusId 9)
            if (dispatch.StatusId === 9) {
              log(`✨ RETURNING STATUS FOUND: ${UNIT_TO_CHECK} is returning (StatusId 9) on call ${call.CallId}`);
              foundReturning = true;
            }
          }
        }
      } else {
        log(`  Call has no dispatch entries`);
      }
    }
    
    if (!foundReturning) {
      log(`\nNo "${UNIT_TO_CHECK}" units with returning status (StatusId 9) were found.`);
    }
  } catch (error) {
    log(`Error checking for returning status: ${error.message}`, true);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting check for returning status...');
    const token = await getApiToken();
    await checkForReturningStatus(token);
    log('Check complete');
  } catch (error) {
    log(`Main function error: ${error.message}`, true);
  }
}

main().catch(console.error);