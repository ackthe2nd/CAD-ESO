/**
 * Check Resgrid status values and ID mappings
 * This script will attempt to discover available status values in the Resgrid system
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
 * Try to fetch status types from Resgrid API
 */
async function fetchStatusTypes(token) {
  try {
    log('Attempting to fetch status types from Resgrid API...');
    // Try potential endpoints that might contain status information
    const endpoints = [
      '/api/v4/Status/GetAllStatuses',
      '/api/v4/Status/GetStatuses',
      '/api/v4/Status/GetAll',
      '/api/v4/Statuses/GetAll'
    ];
    
    for (const endpoint of endpoints) {
      try {
        log(`Trying endpoint: ${endpoint}`);
        const response = await axios.get(`https://api.resgrid.com${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (response.data && response.data.Data) {
          log(`Successfully fetched data from ${endpoint}`);
          return { endpoint, data: response.data.Data };
        }
      } catch (error) {
        log(`Endpoint ${endpoint} failed: ${error.message}`);
        // Continue trying other endpoints
      }
    }
    
    log('All status endpoint attempts failed');
    return null;
  } catch (error) {
    log(`Failed to fetch status types: ${error.message}`, true);
    return null;
  }
}

/**
 * Fetch user statuses to look for status mappings
 */
async function fetchUserStatus(token) {
  try {
    log('Attempting to fetch user status information...');
    const response = await axios.get('https://api.resgrid.com/api/v4/Status/GetEntityStatus', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log('Successfully fetched user status information');
      return response.data.Data;
    } else {
      log('No user status information found or invalid response format');
      return null;
    }
  } catch (error) {
    log(`Failed to fetch user status: ${error.message}`);
    return null;
  }
}

/**
 * Fetch active calls to look for status mappings
 */
async function fetchActiveCalls(token) {
  try {
    log('Fetching active calls to analyze status values...');
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
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
      log('No active calls found or invalid response format');
      return [];
    }
  } catch (error) {
    log(`Failed to fetch active calls: ${error.message}`);
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
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No extra data found for call ${callId} or invalid response format`);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call extra data: ${error.message}`);
    return null;
  }
}

/**
 * Try various API endpoints to find status metadata
 */
async function tryEndpointsForStatusMeta(token) {
  const potentialEndpoints = [
    { path: '/api/v4/Types/GetActionTypes', description: 'Action Types' },
    { path: '/api/v4/Types/GetCallTypes', description: 'Call Types' },
    { path: '/api/v4/Types/GetPriorityTypes', description: 'Priority Types' },
    { path: '/api/v4/Types/GetStatusTypes', description: 'Status Types' },
    { path: '/api/v4/StatusTypes/GetStatusTypes', description: 'Status Types (alt)' },
    { path: '/api/v4/Status/GetTypes', description: 'Status Types (simple)' },
    { path: '/api/v4/Groups/GetGroupTypes', description: 'Group Types' },
    { path: '/api/v4/Status/GetAllForType?type=Unit', description: 'Unit Status Types' },
    { path: '/api/v4/Status/GetStatusOptions', description: 'Status Options' }
  ];
  
  log('Trying various endpoints to find status metadata...');
  for (const endpoint of potentialEndpoints) {
    try {
      log(`Trying ${endpoint.description} endpoint: ${endpoint.path}`);
      const response = await axios.get(`https://api.resgrid.com${endpoint.path}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data) {
        log(`Successfully got response from ${endpoint.path}`);
        // Check if this has useful data
        if (response.data.Data && Array.isArray(response.data.Data) && response.data.Data.length > 0) {
          log(`Found ${response.data.Data.length} items in ${endpoint.description}`);
          // Try to identify if this has status info
          const hasStatusInfo = response.data.Data.some(item => 
            (item.StatusId !== undefined) || 
            (item.Id !== undefined && (item.Name?.toLowerCase().includes('status') || item.Type?.toLowerCase().includes('status')))
          );
          
          if (hasStatusInfo) {
            log(`✓ This endpoint contains status information`);
            log('Sample data:');
            response.data.Data.slice(0, 5).forEach((item, index) => {
              log(`  Item ${index + 1}: ${JSON.stringify(item)}`);
            });
          }
        }
      }
    } catch (error) {
      log(`Endpoint ${endpoint.path} failed: ${error.message}`);
    }
  }
}

/**
 * Analyze extra data from multiple calls to find status mappings
 */
async function analyzeCallsForStatusMappings(token, calls) {
  log('Analyzing calls for status information...');
  
  // Collect all status mappings
  const allStatusMappings = {};
  
  for (const call of calls) {
    const callId = call.CallId;
    const extraData = await fetchCallExtraData(token, callId);
    
    if (!extraData || !extraData.Activity || !Array.isArray(extraData.Activity)) {
      continue;
    }
    
    // Look for status information in activities
    extraData.Activity.forEach(activity => {
      if (activity.StatusId !== undefined && activity.StatusText) {
        if (!allStatusMappings[activity.StatusId]) {
          allStatusMappings[activity.StatusId] = {
            statusId: activity.StatusId,
            statusText: activity.StatusText,
            occurrences: 0,
            examples: []
          };
        }
        
        allStatusMappings[activity.StatusId].occurrences++;
        
        // Keep track of a few examples
        if (allStatusMappings[activity.StatusId].examples.length < 3) {
          allStatusMappings[activity.StatusId].examples.push({
            callId: callId,
            unit: activity.Name,
            timestamp: activity.Timestamp
          });
        }
      }
    });
  }
  
  // Log findings
  log('\nSTATUS ID MAPPINGS FROM CALL ANALYSIS:');
  Object.values(allStatusMappings).forEach(mapping => {
    log(`StatusId ${mapping.statusId} = "${mapping.statusText}" (${mapping.occurrences} occurrences)`);
    mapping.examples.forEach((example, i) => {
      log(`  Example ${i+1}: Call ${example.callId}, Unit ${example.unit}, Time: ${example.timestamp}`);
    });
  });
  
  return allStatusMappings;
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting Resgrid status value check...');
    
    // Get API token
    const token = await getApiToken();
    
    // Try to get status types directly
    const statusTypes = await fetchStatusTypes(token);
    if (statusTypes) {
      log('Found status types via direct API call:');
      log(JSON.stringify(statusTypes.data, null, 2));
    }
    
    // Try to get user status information
    const userStatus = await fetchUserStatus(token);
    if (userStatus) {
      log('Found user status information:');
      log(JSON.stringify(userStatus, null, 2));
    }
    
    // Try various endpoints to find status metadata
    await tryEndpointsForStatusMeta(token);
    
    // Analyze active calls for status mappings
    const activeCalls = await fetchActiveCalls(token);
    if (activeCalls.length > 0) {
      await analyzeCallsForStatusMappings(token, activeCalls);
    }
    
    log('Completed Resgrid status value check');
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