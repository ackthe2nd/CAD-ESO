/**
 * Fetch a specific call from Resgrid API by ID
 * This script will pull call ID 198424 and display its raw data
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  resgrid: {
    tokenUrl: 'https://api.resgrid.com/api/v4/Connect/token',
    callsUrl: 'https://api.resgrid.com/api/v4/Calls/GetCallExtraData'
  },
  auth: {
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }
};

// Logger function for consistent logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMethod = isError ? console.error : console.log;
  logMethod(`${timestamp} - ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching new Resgrid API token...');
    
    // Encode credentials for Basic Auth
    const tokenResponse = await axios.post(
      config.resgrid.tokenUrl,
      new URLSearchParams({
        grant_type: 'password',
        username: config.auth.username,
        password: config.auth.password
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (tokenResponse.data && tokenResponse.data.access_token) {
      log('Successfully obtained new API token');
      return tokenResponse.data.access_token;
    } else {
      throw new Error('Invalid token response from Resgrid API');
    }
  } catch (error) {
    log(`Failed to get API token: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    throw error;
  }
}

/**
 * Fetches detailed call data from Resgrid API for a specific call ID
 * @param {string} token - The API token for authentication
 * @param {string} callId - The ID of the call to fetch data for (198424)
 * @returns {Promise<Object>} The detailed call data
 */
async function getSpecificCallData(token, callId) {
  try {
    log(`Fetching data for call ${callId}...`);
    
    const response = await axios.get(config.resgrid.callsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        callId: callId
      }
    });
    
    if (response.data) {
      log(`Successfully fetched data for call ${callId}`);
      return response.data;
    } else {
      throw new Error(`Invalid response for call ${callId}`);
    }
  } catch (error) {
    log(`Error fetching call data: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    throw error;
  }
}

/**
 * Try alternative method to find the call by searching through recent calls
 * @param {string} token - The API token for authentication
 * @param {string} targetCallId - The call ID we're looking for (198424)
 */
async function findCallInRecentCalls(token, targetCallId) {
  try {
    log(`Trying to find call ${targetCallId} in recent calls...`);
    
    // Try various endpoints to find the call
    const endpoints = [
      'https://api.resgrid.com/api/v4/Calls/GetCalls',
      'https://api.resgrid.com/api/v4/Calls/GetActiveCallsForDepartment',
      'https://api.resgrid.com/api/v4/Calls/GetCallsForDepartment'
    ];
    
    for (const endpoint of endpoints) {
      try {
        log(`Trying endpoint: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.data && Array.isArray(response.data)) {
          log(`Found ${response.data.length} calls from ${endpoint}`);
          
          // Look for our target call ID
          const targetCall = response.data.find(call => 
            call.CallId === targetCallId || 
            call.Id === targetCallId || 
            String(call.CallId) === String(targetCallId) || 
            String(call.Id) === String(targetCallId)
          );
          
          if (targetCall) {
            log(`Found call ${targetCallId} in response!`);
            return targetCall;
          }
        }
      } catch (endpointError) {
        log(`Error with endpoint ${endpoint}: ${endpointError.message}`, true);
      }
    }
    
    log(`Could not find call ${targetCallId} in any endpoint responses`, true);
    return null;
  } catch (error) {
    log(`Error searching for call: ${error.message}`, true);
    return null;
  }
}

/**
 * Compare raw call data with your example
 */
function compareWithExample(callData) {
  log('\n=== COMPARISON WITH YOUR EXAMPLE ===');
  
  // Potential source fields that mapped to XML fields in your example
  const mappings = [
    { xmlField: 'IncidentNumber', possibleSources: ['CallId', 'Id'] },
    { xmlField: 'IncidentOrOnset', possibleSources: ['LoggedOn', 'LoggedOnUtc', 'Timestamp'] },
    { xmlField: 'ComplaintReportedByDispatch', possibleSources: ['Name', 'Nature'] },
    { xmlField: 'VehicleDispatchLocation', possibleSources: ['FullAddress', 'Address'] },
    { xmlField: 'CadDispatchText', possibleSources: ['Note', 'Notes'] },
    { xmlField: 'EmsUnitCallSign', possibleSources: ['Dispatches[].Name where Type="Unit"'] },
    { xmlField: 'Priority', possibleSources: ['Priority.Id'] },
    { xmlField: 'CallNature', possibleSources: ['Name', 'Nature', 'Type'] },
    { xmlField: 'SceneGpsLocationLat', possibleSources: ['Latitude', 'Geolocation.split(",")[0]'] },
    { xmlField: 'SceneGpsLocationLong', possibleSources: ['Longitude', 'Geolocation.split(",")[1]'] }
  ];
  
  log('Checking which fields were probably mapped from your raw data:');
  for (const mapping of mappings) {
    log(`\n${mapping.xmlField} likely mapped from:`);
    for (const source of mapping.possibleSources) {
      // Handle nested properties with dot notation
      const parts = source.split('.');
      let value = callData;
      let exists = true;
      
      for (const part of parts) {
        if (part.includes('[') && part.includes(']')) {
          // Handle array access with filtering
          const arrayName = part.split('[')[0];
          const filterInfo = part.split('[')[1].replace(']', '');
          
          if (value[arrayName] && Array.isArray(value[arrayName])) {
            // Apply filter if specified
            if (filterInfo.includes('where')) {
              const [property, condition] = filterInfo.split('where');
              const [filterProp, filterValue] = condition.trim().split('=');
              
              // Filter the array based on the condition
              value = value[arrayName].filter(item => 
                item[filterProp.trim()] === filterValue.replace(/"/g, '').trim()
              );
              
              if (value.length > 0) {
                log(`  ✓ ${source} exists (filtered array has ${value.length} items)`);
              } else {
                log(`  ✗ ${source} not found (no items match filter)`);
                exists = false;
              }
            } else {
              log(`  ✓ ${source} exists (array has ${value[arrayName].length} items)`);
            }
          } else {
            log(`  ✗ ${source} not found (${arrayName} is not an array or doesn't exist)`);
            exists = false;
          }
          break;
        } else if (value[part] !== undefined) {
          value = value[part];
        } else {
          log(`  ✗ ${source} not found (${part} doesn't exist)`);
          exists = false;
          break;
        }
      }
      
      if (exists && value !== undefined) {
        // Format the value for display
        let displayValue = typeof value === 'object' ? JSON.stringify(value) : value;
        if (displayValue.length > 100) {
          displayValue = displayValue.substring(0, 100) + '...';
        }
        log(`  ✓ ${source} = ${displayValue}`);
      }
    }
  }
}

/**
 * Main function to fetch and analyze the specific call
 */
async function main() {
  try {
    const TARGET_CALL_ID = '198424';
    log(`Starting to fetch call ${TARGET_CALL_ID}...`);
    
    // Get API token
    const token = await getApiToken();
    
    // Try direct fetch first
    try {
      const callData = await getSpecificCallData(token, TARGET_CALL_ID);
      log('Call data found directly via GetCallExtraData!');
      
      // Save raw data to file
      const rawDataPath = path.join(__dirname, 'logs', `call_${TARGET_CALL_ID}_raw.json`);
      fs.writeFileSync(rawDataPath, JSON.stringify(callData, null, 2));
      log(`Raw call data saved to: ${rawDataPath}`);
      
      // Display the mapping analysis
      compareWithExample(callData);
      return;
    } catch (directFetchError) {
      log(`Direct fetch failed, trying alternative methods: ${directFetchError.message}`, true);
    }
    
    // Try finding in recent calls
    const callFromSearch = await findCallInRecentCalls(token, TARGET_CALL_ID);
    if (callFromSearch) {
      log('Call data found by searching through recent calls!');
      
      // Save raw data to file
      const rawDataPath = path.join(__dirname, 'logs', `call_${TARGET_CALL_ID}_raw.json`);
      fs.writeFileSync(rawDataPath, JSON.stringify(callFromSearch, null, 2));
      log(`Raw call data saved to: ${rawDataPath}`);
      
      // Display the mapping analysis
      compareWithExample(callFromSearch);
      return;
    }
    
    log(`Could not find call ${TARGET_CALL_ID} in Resgrid API using any method`, true);
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the main function
main();