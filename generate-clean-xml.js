/**
 * Generate clean XML with real call data
 * This script takes a call ID, fetches the data, and generates properly formatted XML
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getApiToken } = require('./src/token-manager');
const { generateXML } = require('./src/xml-generator');

// Main function
async function main() {
  try {
    // Get the call ID from command line arguments or use most recent
    let callId = process.argv[2];
    if (!callId) {
      console.log('No call ID provided, using most recent call...');
      callId = await getRecentCallId();
    }
    
    console.log(`Generating XML for call ID: ${callId}`);
    
    // Get a valid API token
    const token = await getApiToken();
    
    // Fetch call data
    const callData = await fetchCallData(token, callId);
    
    // Generate XML
    const xml = generateXML(callData);
    
    // Save to file
    const outputPath = path.join(__dirname, 'logs', `incident_${callId}_clean.xml`);
    fs.writeFileSync(outputPath, xml);
    
    console.log(`XML saved to: ${outputPath}`);
    console.log('\nGenerated XML:');
    console.log(xml);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data)}`);
    }
  }
}

// Get the most recent call ID
async function getRecentCallId() {
  try {
    const token = await getApiToken();
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && response.data.Data.length > 0) {
      return response.data.Data[0].CallId;
    } else {
      throw new Error('No active calls found');
    }
  } catch (error) {
    throw new Error(`Failed to get recent call ID: ${error.message}`);
  }
}

// Fetch call data from Resgrid API
async function fetchCallData(token, callId) {
  try {
    // Get extra data for the call
    const extraDataResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
      params: { callId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Get basic call data
    const callDataResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetActiveCalls`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Find the specific call in the active calls
    const matchingCall = callDataResponse.data.Data.find(call => call.CallId === callId);
    
    if (!matchingCall) {
      throw new Error(`Call with ID ${callId} not found in active calls`);
    }
    
    // Combine the data
    return {
      GetCall: {
        Data: matchingCall
      },
      GetCallExtraData: extraDataResponse.data
    };
  } catch (error) {
    throw new Error(`Failed to fetch call data: ${error.message}`);
  }
}

// Run the script
main();