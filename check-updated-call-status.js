/**
 * Check for updated status on call 198513, focusing on "returning" status
 * This script will fetch the most recent data for the call and log all status information
 */
require('dotenv').config();
const axios = require('axios');

const CALL_ID = '198513'; // Call to check for returning status

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
 * Fetch most up-to-date call data for a specific call ID
 */
async function fetchCallData(token, callId) {
  try {
    log(`Fetching latest data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched basic data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No data found for call ${callId} or invalid response format`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch extra data for a specific call ID, including latest activity
 */
async function fetchCallExtraData(token, callId) {
  try {
    log(`Fetching latest extra data for call ${callId}...`);
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
    throw error;
  }
}

/**
 * Check call activities for status information, with detailed logging
 */
function checkCallStatus(callData, extraData) {
  log('Checking call status information...');
  
  // Try to find a valid unit name
  let unitName = '';
  
  // First from UnitsCsv
  if (callData.UnitsCsv) {
    const unitsList = callData.UnitsCsv.split(',').map(u => u.trim());
    const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
    if (validUnit) {
      unitName = validUnit;
      log(`Found unit name from UnitsCsv: ${unitName}`);
    }
  }
  
  // Then from Dispatches
  if (!unitName && extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
    const validUnits = extraData.Dispatches.filter(d => 
      d.Type === 'Unit' && 
      d.Name && 
      d.Name.length <= 9 && 
      /^[a-zA-Z0-9]+$/.test(d.Name)
    );
    
    if (validUnits.length > 0) {
      unitName = validUnits[0].Name;
      log(`Found unit name from Dispatches: ${unitName}`);
    }
  }
  
  // If no valid unit found
  if (!unitName) {
    log('No valid unit name found to check statuses', true);
    return;
  }
  
  // Look for activities for this unit
  if (!extraData.Activity || !Array.isArray(extraData.Activity) || extraData.Activity.length === 0) {
    log('No activity data found for this call', true);
    return;
  }
  
  // Filter for unit-related activities
  const unitActivities = extraData.Activity.filter(a => 
    a.Type === 'Unit' && a.Name === unitName && a.Timestamp
  );
  
  if (unitActivities.length === 0) {
    log(`No activities found for unit ${unitName}`, true);
    return;
  }
  
  log(`Found ${unitActivities.length} activities for unit ${unitName}`);
  
  // Sort activities by timestamp to get the timeline
  unitActivities.sort((a, b) => {
    const dateA = new Date(a.Timestamp);
    const dateB = new Date(b.Timestamp);
    return dateA - dateB;
  });
  
  // Check for keywords that might indicate returning status
  const returningKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
  
  // Display all activities
  log('\nACTIVITY TIMELINE:');
  unitActivities.forEach((activity, index) => {
    log(`Activity ${index + 1}:`);
    log(`  Type: ${activity.Type}`);
    log(`  Name: ${activity.Name}`);
    log(`  Timestamp: ${activity.Timestamp}`);
    log(`  StatusId: ${activity.StatusId}`);
    log(`  StatusText: ${activity.StatusText || 'N/A'}`);
    
    // Check for specific status types
    if (activity.StatusId === 5) {
      log(`  ➡️ EN ROUTE status detected`);
    }
    if (activity.StatusId === 6) {
      log(`  ➡️ ON SCENE status detected`);
    }
    if (activity.StatusId === 2) {
      log(`  ➡️ AVAILABLE status detected (potential back in service)`);
    }
    
    // Check for text suggesting returning status
    if (activity.StatusText) {
      const lowerText = activity.StatusText.toLowerCase();
      const matchedKeyword = returningKeywords.find(keyword => lowerText.includes(keyword));
      if (matchedKeyword) {
        log(`  ➡️ '${matchedKeyword.toUpperCase()}' keyword detected (potential back in service)`);
      }
    }
  });
  
  // Collect all status IDs and map them to text
  log('\nSTATUS ID MAPPING:');
  const statusMap = {};
  unitActivities.forEach(a => {
    if (a.StatusId && a.StatusText) {
      statusMap[a.StatusId] = a.StatusText;
    }
  });
  
  Object.entries(statusMap).forEach(([id, text]) => {
    log(`StatusId ${id} = "${text}"`);
  });
  
  // If we have returning status
  const returningStatusActivity = unitActivities.find(a => {
    if (!a.StatusText) return false;
    return returningKeywords.some(keyword => a.StatusText.toLowerCase().includes(keyword));
  });
  
  if (returningStatusActivity) {
    log('\nRETURNING STATUS FOUND:');
    log(`  Timestamp: ${returningStatusActivity.Timestamp}`);
    log(`  StatusId: ${returningStatusActivity.StatusId}`);
    log(`  StatusText: ${returningStatusActivity.StatusText}`);
  } else {
    log('\nNo explicit returning status found');
  }
  
  // Check for explicit Status IDs that may indicate back in service
  const statusId2Activity = unitActivities.find(a => a.StatusId === 2);
  if (statusId2Activity) {
    log('\nSTATUS ID 2 FOUND (commonly "Available"):');
    log(`  Timestamp: ${statusId2Activity.Timestamp}`);
    log(`  StatusText: ${statusId2Activity.StatusText || 'N/A'}`);
  } else {
    log('\nNo StatusId 2 (Available) found');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log(`Starting to check updated status for call ${CALL_ID}...`);
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch call data
    const callData = await fetchCallData(token, CALL_ID);
    if (!callData) {
      log(`Cannot find call with ID ${CALL_ID}`, true);
      return;
    }
    
    // Fetch extra data
    const extraData = await fetchCallExtraData(token, CALL_ID);
    if (!extraData) {
      log(`Cannot find extra data for call with ID ${CALL_ID}`, true);
      return;
    }
    
    // Check call status
    checkCallStatus(callData, extraData);
    
    log('Completed checking call status');
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