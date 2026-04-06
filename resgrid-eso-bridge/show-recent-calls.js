require('dotenv').config();
const axios = require('axios');

// Load Resgrid credentials from environment variables
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;

/**
 * Logger function for consistent logging
 */
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMethod = isError ? console.error : console.log;
  logMethod(`[${timestamp}] ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching Resgrid API token...');
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'password');
    formData.append('username', RESGRID_USER);
    formData.append('password', RESGRID_PASS);
    
    const response = await axios.post(
      'https://api.resgrid.com/api/v4/Connect/token',
      formData,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.status === 200 && response.data.access_token) {
      log('Successfully obtained API token');
      return response.data.access_token;
    } else {
      throw new Error('Failed to obtain API token: Invalid response');
    }
  } catch (error) {
    log(`Failed to obtain API token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch recent calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {number} days - How many days back to fetch calls for
 * @returns {Promise<Array>} List of calls
 */
async function fetchRecentCalls(token, days = 7) {
  try {
    log(`Fetching active calls from Resgrid...`);
    
    // Based on our tests, the GetActiveCalls endpoint works
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.status === 200 && response.data && response.data.Data) {
      const calls = response.data.Data;
      log(`Successfully fetched ${calls.length} active calls`);
      
      // Filter calls by date if needed
      if (days > 0) {
        const startDate = new Date(Date.now() - (days * 24 * 60 * 60 * 1000));
        const filteredCalls = calls.filter(call => {
          const callDate = new Date(call.LoggedOnUtc || call.LoggedOn);
          return callDate >= startDate;
        });
        
        log(`${filteredCalls.length} calls are from the last ${days} days`);
        return filteredCalls;
      }
      
      return calls;
    } else {
      log(`Unexpected response format or empty data`, true);
      console.log(JSON.stringify(response.data, null, 2));
      return [];
    }
  } catch (error) {
    log(`Failed to fetch calls: ${error.message}`, true);
    if (error.response) {
      log(`Error details: ${JSON.stringify(error.response.data, null, 2)}`, true);
    }
    throw error;
  }
}

/**
 * Main function to display recent calls
 */
async function main() {
  // Parse command line arguments for days (default to 7 if not provided)
  const args = process.argv.slice(2);
  const daysArg = args.find(arg => arg.startsWith('--days='));
  const days = daysArg ? parseInt(daysArg.split('=')[1], 10) : 7;
  
  try {
    // Validate required environment variables
    if (!RESGRID_USER || !RESGRID_PASS) {
      log('Missing required Resgrid credentials (RESGRID_USER, RESGRID_PASS)', true);
      process.exit(1);
    }
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch recent calls
    const calls = await fetchRecentCalls(token, days);
    
    if (calls.length === 0) {
      log('No calls found in the specified time period.');
      return;
    }
    
    // Display call information in a table format
    console.log('\n===== RECENT CALLS FROM RESGRID =====');
    console.log('ID\t|\tDate\t|\tNature\t|\tAddress');
    console.log('-'.repeat(80));
    
    calls.forEach(call => {
      const date = new Date(call.LoggedOn).toLocaleString();
      console.log(`${call.CallId}\t|\t${date}\t|\t${call.Name || 'N/A'}\t|\t${call.Address || 'N/A'}`);
    });
    
    console.log('\n===== CALL DETAILS =====');
    console.log(JSON.stringify(calls[0], null, 2));
    
    console.log('\nTo process these calls and send them to ESO, run:');
    console.log('node fetch-existing-calls.js --days=7');
    
  } catch (error) {
    log(`Failed to retrieve calls: ${error.message}`, true);
    process.exit(1);
  }
}

// Start the process
log('Starting to fetch existing Resgrid calls...');
main().catch(error => {
  log(`Unhandled error: ${error.message}`, true);
  process.exit(1);
});