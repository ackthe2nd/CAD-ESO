/**
 * Check recent call data for "committed" status values
 * Use the working API endpoints already confirmed in the application
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
 * Fetch calls from the API using confirmed working endpoint
 */
async function fetchCalls(token) {
  try {
    // We know this API endpoint works from our existing code
    log('Fetching recent calls using confirmed working endpoint...');
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Found ${response.data.Data.length} active calls`);
      return response.data.Data;
    } else {
      log('No call data found');
      return [];
    }
  } catch (error) {
    log(`Error fetching calls: ${error.message}`);
    return [];
  }
}

/**
 * Fetch extra data for a call using confirmed working endpoint
 */
async function fetchCallExtraData(token, callId) {
  try {
    // We know this API endpoint works from our existing code
    log(`Fetching extra data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No extra data found for call ${callId}`);
      return {};
    }
  } catch (error) {
    log(`Error fetching call extra data: ${error.message}`);
    return {};
  }
}

/**
 * Analyze calls to find status mappings
 */
async function analyzeCalls(token, calls) {
  // Status codes we already know
  const knownStatusMap = {
    2: 'Available',
    5: 'En Route',
    6: 'On Scene',
    7: 'At Patient',
    8: 'Cleared',
    9: 'Returning'
  };
  
  log('\nKnown status code mappings:');
  Object.entries(knownStatusMap).forEach(([id, text]) => {
    log(`  StatusId ${id} = "${text}"`);
  });
  
  // Check if any calls have a different "committed" status code for "at patient"
  log('\nChecking active calls for status mappings...');
  
  // Track all status codes found in activity
  const allStatusCodes = {};
  // Track statuses with "commit" in the name specifically
  const commitStatusCodes = {};
  
  // Process each call
  let callsChecked = 0;
  
  for (const call of calls) {
    callsChecked++;
    
    // Limit to 10 calls to avoid too much API traffic
    if (callsChecked > 10) break;
    
    try {
      const callId = call.CallId;
      log(`\nAnalyzing call ${callId}...`);
      
      const extraData = await fetchCallExtraData(token, callId);
      
      if (!extraData.Activity || !Array.isArray(extraData.Activity)) {
        log(`No activity data for call ${callId}`);
        continue;
      }
      
      log(`Call ${callId} has ${extraData.Activity.length} activity entries`);
      
      // Record all status codes
      extraData.Activity.forEach(activity => {
        if (activity.StatusId !== undefined) {
          if (!allStatusCodes[activity.StatusId]) {
            allStatusCodes[activity.StatusId] = {
              text: activity.StatusText || 'Unknown',
              count: 0
            };
          }
          allStatusCodes[activity.StatusId].count++;
          
          // Check for "commit" in status text
          if (activity.StatusText && activity.StatusText.toLowerCase().includes('commit')) {
            if (!commitStatusCodes[activity.StatusId]) {
              commitStatusCodes[activity.StatusId] = {
                text: activity.StatusText,
                examples: []
              };
            }
            
            // Store example with unit and timestamp
            if (commitStatusCodes[activity.StatusId].examples.length < 3) {
              commitStatusCodes[activity.StatusId].examples.push({
                unit: activity.Name,
                timestamp: activity.Timestamp
              });
            }
          }
        }
      });
    } catch (error) {
      log(`Error analyzing call: ${error.message}`);
    }
  }
  
  // Output all status codes found
  log('\nAll status codes found in calls:');
  Object.entries(allStatusCodes).forEach(([id, info]) => {
    log(`  StatusId ${id} = "${info.text}" (found ${info.count} times)`);
  });
  
  // Output commit status codes if found
  if (Object.keys(commitStatusCodes).length > 0) {
    log('\nFOUND STATUS CODES WITH "COMMIT" IN NAME:');
    Object.entries(commitStatusCodes).forEach(([id, info]) => {
      log(`  StatusId ${id} = "${info.text}"`);
      info.examples.forEach((ex, i) => {
        log(`    Example ${i+1}: Unit ${ex.unit} at ${ex.timestamp}`);
      });
    });
    
    log('\nRECOMMENDED ACTION: Update the "at patient" status ID to match the committed status ID');
  } else {
    log('\nNo status codes with "commit" in the name were found.');
    log('RECOMMENDATION: Continue using StatusId 7 for "At Patient" time');
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting unit status code analysis...');
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch active calls
    const calls = await fetchCalls(token);
    
    // Analyze status codes in calls
    if (calls.length > 0) {
      await analyzeCalls(token, calls);
    } else {
      log('No active calls to analyze. Try again when there are active calls.');
    }
    
    log('Completed unit status code analysis');
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
  }
}

// Run the main function
main().catch(console.error);