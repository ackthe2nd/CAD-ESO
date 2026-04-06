/**
 * Check Resgrid unit status codes, looking for "committed" status
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
 * Try to fetch status types with a focus on unit statuses
 */
async function fetchUnitStatusTypes(token) {
  const endpoints = [
    { url: '/api/v4/Status/GetAllForType?type=Unit', name: 'Unit Statuses' },
    { url: '/api/v4/Status/GetStatuses', name: 'All Statuses' },
    { url: '/api/v4/Units/GetAllStatuses', name: 'Unit Status List' },
    { url: '/api/v4/Types/GetStatusTypes', name: 'Status Types' }
  ];
  
  log('Searching for unit status codes...');
  
  for (const endpoint of endpoints) {
    try {
      log(`Trying endpoint: ${endpoint.name} (${endpoint.url})`);
      const response = await axios.get(`https://api.resgrid.com${endpoint.url}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      if (response.data && response.data.Data) {
        const statusData = response.data.Data;
        
        if (Array.isArray(statusData) && statusData.length > 0) {
          log(`Found ${statusData.length} statuses in ${endpoint.name}`);
          
          // Print all status entries with their IDs
          log('\nAll Status Entries:');
          const statusLog = statusData.map(status => {
            // Determine which fields exist
            const id = status.Id || status.StatusId || status.Code || 'Unknown';
            const name = status.Name || status.StatusText || status.Text || 'Unknown';
            
            // Check if this status contains "commit" in any form
            const isCommit = name.toLowerCase().includes('commit');
            const prefix = isCommit ? '→→→ ' : '    ';
            
            return `${prefix}ID: ${id}, Name: "${name}"`;
          });
          
          // Sort alphabetically by name for easier scanning
          statusLog.sort();
          statusLog.forEach(entry => log(entry));
          
          // Specific search for committed status
          const commitStatuses = statusData.filter(status => {
            const name = (status.Name || status.StatusText || status.Text || '').toLowerCase();
            return name.includes('commit');
          });
          
          if (commitStatuses.length > 0) {
            log('\nFOUND COMMITTED STATUSES:');
            commitStatuses.forEach(status => {
              const id = status.Id || status.StatusId || status.Code || 'Unknown';
              const name = status.Name || status.StatusText || status.Text || 'Unknown';
              log(`*** COMMITTED STATUS: ID=${id}, Name="${name}" ***`);
            });
          }
        }
      }
    } catch (error) {
      log(`Error with ${endpoint.name}: ${error.message}`);
    }
  }
}

/**
 * Fetch recent calls to check their status logs for committed status
 */
async function checkCallsForStatus(token) {
  try {
    log('\nFetching recent calls to check for status events...');
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCallsInDateRange', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      params: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString()
      }
    });
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      log('No call data returned from API');
      return;
    }
    
    const calls = response.data.Data;
    log(`Found ${calls.length} recent calls to analyze`);
    
    // Only check a few calls to keep response time reasonable
    const callsToCheck = calls.slice(0, 5);
    
    for (const call of callsToCheck) {
      try {
        log(`\nFetching details for call ${call.CallId} (${call.Name || 'Unnamed'})...`);
        const extraData = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${call.CallId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        if (!extraData.data || !extraData.data.Data || !extraData.data.Data.Activity) {
          log(`No activity data for call ${call.CallId}`);
          continue;
        }
        
        const activity = extraData.data.Data.Activity;
        log(`Call ${call.CallId} has ${activity.length} activity entries`);
        
        // Look for all unique status IDs and their text values
        const statusMap = {};
        activity.forEach(act => {
          if (act.StatusId) {
            statusMap[act.StatusId] = act.StatusText || 'Unknown';
          }
        });
        
        log('Status IDs found in this call:');
        Object.entries(statusMap).forEach(([id, text]) => {
          log(`  StatusId ${id} = "${text}"`);
        });
        
        // Check for anything with "commit" in the StatusText
        const commitActivities = activity.filter(act => 
          (act.StatusText && act.StatusText.toLowerCase().includes('commit'))
        );
        
        if (commitActivities.length > 0) {
          log('\nFOUND COMMITTED STATUS ACTIVITIES:');
          commitActivities.forEach(act => {
            log(`*** COMMITTED: StatusId=${act.StatusId}, StatusText="${act.StatusText}", Unit=${act.Name} ***`);
          });
        }
      } catch (error) {
        log(`Error analyzing call ${call.CallId}: ${error.message}`);
      }
    }
  } catch (error) {
    log(`Error fetching calls: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting Resgrid unit status code check...');
    
    // Get API token
    const token = await getApiToken();
    
    // Try to get unit status codes
    await fetchUnitStatusTypes(token);
    
    // Check calls for status
    await checkCallsForStatus(token);
    
    log('Completed unit status code check');
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