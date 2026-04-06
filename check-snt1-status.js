/**
 * Check the current status of the SNT1 unit
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
 * Search for SNT1 unit in all endpoints that might provide unit status
 */
async function searchForSNT1Status(token) {
  try {
    log('Trying to get all units and their statuses...');
    
    // Try all potential endpoints that might have unit status
    const endpoints = [
      { url: '/api/v4/Units/GetAllStatuses', name: 'Unit Statuses' },
      { url: '/api/v4/Units/GetAll', name: 'All Units' },
      { url: '/api/v4/Units/GetAllUnitsAndStatus', name: 'Units and Status' },
      { url: '/api/v4/Status/GetEntityStatus', name: 'Entity Status' },
      { url: '/api/v4/Units/GetAvailableUnitCounts', name: 'Available Units' },
      { url: '/api/v4/Resources/GetAllResources', name: 'Resources' },
      { url: '/api/v4/Resources/GetAll', name: 'All Resources' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        log(`Trying endpoint: ${endpoint.name} (${endpoint.url})`);
        const response = await axios.get(`https://api.resgrid.com${endpoint.url}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Accept': 'application/json'
          }
        });
        
        if (response.data?.Data) {
          const data = response.data.Data;
          log(`Found data in ${endpoint.name} endpoint`);
          
          if (Array.isArray(data)) {
            log(`Found ${data.length} items`);
            
            // Specifically look for SNT1
            const snt1Items = data.filter(item => {
              return (
                (item.Name === 'SNT1') || 
                (item.UnitName === 'SNT1') || 
                (item.Identifier === 'SNT1') ||
                (item.Id === 'SNT1')
              );
            });
            
            if (snt1Items.length > 0) {
              log(`FOUND SNT1 IN ${endpoint.name}!`);
              log('Full data:');
              snt1Items.forEach((item, i) => {
                log(`SNT1 Item ${i+1}:`);
                log(JSON.stringify(item, null, 2));
                
                // Specifically check for commit or committed status
                if (item.StatusId !== undefined || item.State !== undefined || item.Status !== undefined) {
                  const statusId = item.StatusId || item.State || item.Status;
                  const statusText = item.StatusText || item.StateText || item.StatusName || 'Unknown';
                  
                  log(`SNT1 STATUS FOUND: StatusId=${statusId}, StatusText="${statusText}"`);
                  
                  if (statusText.toLowerCase().includes('commit')) {
                    log(`!!! COMMITTED STATUS CONFIRMED: StatusId=${statusId} = "${statusText}" !!!`);
                  }
                }
              });
            }
          } else if (typeof data === 'object') {
            // Try to find status for SNT1 in a non-array response
            log('Response is an object, not an array. Checking for SNT1...');
            
            const snt1Properties = Object.keys(data).filter(key => 
              key === 'SNT1' || 
              (typeof data[key] === 'object' && data[key]?.Name === 'SNT1')
            );
            
            if (snt1Properties.length > 0) {
              log(`FOUND SNT1 IN ${endpoint.name}!`);
              for (const prop of snt1Properties) {
                log(`SNT1 Data from property ${prop}:`);
                log(JSON.stringify(data[prop], null, 2));
              }
            }
          }
        } else {
          log(`No data found in ${endpoint.name} endpoint`);
        }
      } catch (error) {
        log(`Error with ${endpoint.name}: ${error.message}`);
      }
    }
  } catch (error) {
    log(`Error searching for SNT1: ${error.message}`);
  }
}

/**
 * Try to get all active calls to see if SNT1 is assigned with a status
 */
async function checkActiveCalls(token) {
  try {
    log('\nChecking active calls for SNT1 assignments...');
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.Data) {
      const calls = response.data.Data;
      log(`Found ${calls.length} active calls`);
      
      // Process each call to look for SNT1 unit
      for (const call of calls) {
        try {
          log(`\nChecking call ${call.CallId} for SNT1 status...`);
          const extraData = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${call.CallId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          });
          
          if (extraData.data?.Data) {
            const callData = extraData.data.Data;
            
            // Check activity records for SNT1
            if (callData.Activity && Array.isArray(callData.Activity)) {
              const snt1Activities = callData.Activity.filter(act => 
                act.Name === 'SNT1' || 
                act.UnitId === 'SNT1' || 
                act.Unit === 'SNT1'
              );
              
              if (snt1Activities.length > 0) {
                log(`FOUND SNT1 ACTIVITIES IN CALL ${call.CallId}!`);
                snt1Activities.forEach((act, i) => {
                  log(`SNT1 Activity ${i+1}:`);
                  log(`  StatusId: ${act.StatusId}`);
                  log(`  StatusText: "${act.StatusText}"`);
                  log(`  Timestamp: ${act.Timestamp}`);
                  
                  if (act.StatusText && act.StatusText.toLowerCase().includes('commit')) {
                    log(`!!! COMMITTED STATUS CONFIRMED: StatusId=${act.StatusId} = "${act.StatusText}" !!!`);
                  }
                });
              }
            }
            
            // Check dispatches for SNT1
            if (callData.Dispatches && Array.isArray(callData.Dispatches)) {
              const snt1Dispatches = callData.Dispatches.filter(d => 
                d.Name === 'SNT1' || 
                d.UnitId === 'SNT1' || 
                d.Unit === 'SNT1' ||
                d.Identifier === 'SNT1'
              );
              
              if (snt1Dispatches.length > 0) {
                log(`FOUND SNT1 DISPATCHES IN CALL ${call.CallId}!`);
                snt1Dispatches.forEach((d, i) => {
                  log(`SNT1 Dispatch ${i+1}:`);
                  log(JSON.stringify(d, null, 2));
                  
                  if (d.StatusText && d.StatusText.toLowerCase().includes('commit')) {
                    log(`!!! COMMITTED STATUS CONFIRMED IN DISPATCH: StatusId=${d.StatusId} = "${d.StatusText}" !!!`);
                  }
                });
              }
            }
          }
        } catch (error) {
          log(`Error checking call ${call.CallId}: ${error.message}`);
        }
      }
    }
  } catch (error) {
    log(`Error checking active calls: ${error.message}`);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting search for SNT1 unit status...');
    const token = await getApiToken();
    
    // Search for SNT1 status in unit endpoints
    await searchForSNT1Status(token);
    
    // Check active calls for SNT1 status
    await checkActiveCalls(token);
    
    log('Completed search for SNT1 status');
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
  }
}

// Run the main function
main().catch(console.error);