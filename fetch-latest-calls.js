/**
 * Resgrid to ESO Bridge - Fetch Latest Calls Utility
 * 
 * This script fetches and displays the latest active calls from Resgrid API
 * Includes call details and handles token authentication
 */
require('dotenv').config();
const { getApiToken } = require('./src/token-manager');
const axios = require('axios');

const RESGRID_API_BASE = 'https://api.resgrid.com/api/v4';

// Format date for easier reading
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleString();
}

// Display call details in a readable format
function displayCall(call, index) {
  console.log(`\n----- Call #${index + 1} -----`);
  console.log(`Call ID: ${call.CallId}`);
  console.log(`Name: ${call.Name}`);
  console.log(`Priority: ${call.Priority}`);
  console.log(`Type: ${call.Type || 'Not specified'}`);
  console.log(`Address: ${call.Address}`);
  console.log(`Logged: ${formatDate(call.LoggedOn)}`);
  console.log(`Contact: ${call.ContactName || 'N/A'} (${call.ContactInfo || 'N/A'})`);
  
  if (call.ExternalId) {
    console.log(`External ID (DOB): ${call.ExternalId}`);
  }
  
  console.log(`Description: ${call.Nature}`);
  
  if (call.Note) {
    console.log(`Note: ${call.Note}`);
  }
  
  console.log('------------------------');
}

// Fetch active calls from Resgrid API
async function fetchActiveCalls(token) {
  try {
    console.log('Fetching active calls from Resgrid...');
    
    const response = await axios.get(`${RESGRID_API_BASE}/Calls/GetActiveCalls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
    
    // Check if we have calls in the response
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      return response.data.Data;
    } else {
      console.log('No calls found or unexpected response format');
      return [];
    }
  } catch (error) {
    console.error(`Error fetching active calls: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error('Response:', error.response.data);
    }
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Get API token
    const token = await getApiToken();
    console.log('Successfully obtained API token');
    
    // Fetch active calls
    const calls = await fetchActiveCalls(token);
    
    // Display results
    if (calls.length > 0) {
      console.log(`\nFound ${calls.length} active call(s):`);
      calls.forEach((call, index) => displayCall(call, index));
      
      console.log(`\nTotal: ${calls.length} active call(s)`);
    } else {
      console.log('No active calls found.');
    }
  } catch (error) {
    console.error(`Failed to fetch calls: ${error.message}`);
    process.exit(1);
  }
}

// Start the process
main();