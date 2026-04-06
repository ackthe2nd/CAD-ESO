/**
 * Check all active calls for returning status or related activities
 * This script will fetch all active calls and check each one for units with returning status
 */
require('dotenv').config();
const axios = require('axios');

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
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetActiveCalls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      const calls = response.data.Data;
      log(`Successfully fetched ${calls.length} active calls`);
      return calls;
    } else {
      log('No active calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Failed to fetch active calls: ${error.message}`, true);
    throw error;
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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No extra data found for call ${callId} or invalid response format`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call extra data: ${error.message}`, true);
    return null;
  }
}

/**
 * Check a specific call for units with returning status
 */
async function checkCallForStatus(token, call) {
  const callId = call.CallId;
  log(`Checking call ${callId}: ${call.Name} (${new Date(call.LoggedOn).toLocaleString()})`);
  
  // Fetch extra data for this call
  const extraData = await fetchCallExtraData(token, callId);
  if (!extraData) {
    log(`Skipping call ${callId} due to missing extra data`);
    return { hasReturningStatus: false };
  }
  
  // Check if this call has activity
  if (!extraData.Activity || !Array.isArray(extraData.Activity) || extraData.Activity.length === 0) {
    log(`Call ${callId} has no activity data`);
    return { hasReturningStatus: false };
  }
  
  // Look for any status with "returning" in the text or status ID that matches
  const keywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
  const activeStatusIds = [2]; // Commonly "Available"
  
  // Variables to track found statuses
  let returningStatusFound = false;
  let returningActivity = null;
  
  // Check all activities in the call
  extraData.Activity.forEach(activity => {
    // Skip non-Unit activities
    if (activity.Type !== 'Unit') return;
    
    // Check for keyword match
    if (activity.StatusText) {
      const lowerText = activity.StatusText.toLowerCase();
      const matchedKeyword = keywords.find(keyword => lowerText.includes(keyword));
      
      if (matchedKeyword) {
        returningStatusFound = true;
        returningActivity = activity;
        log(`  ✓ Unit ${activity.Name} has '${matchedKeyword}' status (StatusId ${activity.StatusId}): ${activity.StatusText}`);
        log(`    Timestamp: ${activity.Timestamp}`);
      }
    }
    
    // Check for status ID match
    if (activeStatusIds.includes(activity.StatusId)) {
      returningStatusFound = true;
      returningActivity = activity;
      log(`  ✓ Unit ${activity.Name} has StatusId ${activity.StatusId} (potential returning status)`);
      log(`    StatusText: ${activity.StatusText || 'Unknown'}`);
      log(`    Timestamp: ${activity.Timestamp}`);
    }
  });
  
  // Get all unique status IDs and their text for reference
  const statusMap = {};
  extraData.Activity.forEach(a => {
    if (a.StatusId && a.Type === 'Unit') {
      statusMap[a.StatusId] = a.StatusText || 'Unknown';
    }
  });
  
  if (Object.keys(statusMap).length > 0) {
    log('  Status ID mapping for this call:');
    Object.entries(statusMap).forEach(([id, text]) => {
      log(`    StatusId ${id} = "${text}"`);
    });
  }
  
  // Return result
  return { 
    hasReturningStatus: returningStatusFound,
    returningActivity
  };
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting to check all active calls for returning status...');
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch active calls
    const activeCalls = await fetchActiveCalls(token);
    if (activeCalls.length === 0) {
      log('No active calls to check');
      return;
    }
    
    // Check each call for returning status
    log(`Checking ${activeCalls.length} calls for returning status...`);
    
    const results = [];
    for (const call of activeCalls) {
      const result = await checkCallForStatus(token, call);
      results.push({
        callId: call.CallId,
        callName: call.Name,
        ...result
      });
    }
    
    // Summarize findings
    const callsWithReturningStatus = results.filter(r => r.hasReturningStatus);
    
    log('\nSUMMARY:');
    log(`Total calls checked: ${results.length}`);
    log(`Calls with returning status: ${callsWithReturningStatus.length}`);
    
    if (callsWithReturningStatus.length > 0) {
      log('\nCALLS WITH RETURNING STATUS:');
      callsWithReturningStatus.forEach(call => {
        log(`Call ${call.callId} - ${call.callName}`);
        if (call.returningActivity) {
          log(`  Unit: ${call.returningActivity.Name}`);
          log(`  Status: ${call.returningActivity.StatusText || 'Unknown'} (ID: ${call.returningActivity.StatusId})`);
          log(`  Timestamp: ${call.returningActivity.Timestamp}`);
        }
      });
    }
    
    log('Completed checking all active calls');
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(error);
  process.exit(1);
});