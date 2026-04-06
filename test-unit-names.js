/**
 * Test script to verify unit name extraction and inclusion in XML
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const { generateXML } = require('./src/xml-generator');

// Function to get an API token
async function getToken() {
  try {
    const tokenUrl = 'https://api.resgrid.com/api/v4/Connect/token';
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('username', process.env.RESGRID_USER);
    params.append('password', process.env.RESGRID_PASS);
    
    const response = await axios.post(tokenUrl, params);
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting token:', error.message);
    throw error;
  }
}

// Function to get active calls
async function getActiveCalls(token) {
  try {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      return response.data.Data;
    } else if (Array.isArray(response.data)) {
      return response.data;
    }
    
    console.error('Unexpected response format from GetActiveCalls');
    return [];
  } catch (error) {
    console.error('Error getting active calls:', error.message);
    return [];
  }
}

// Function to get call extra data
async function getCallExtraData(token, callId) {
  try {
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Error getting extra data for call ${callId}:`, error.message);
    return null;
  }
}

// Main function
async function main() {
  try {
    // Get API token
    const token = await getToken();
    console.log('Successfully got API token');
    
    // Get active calls
    const activeCalls = await getActiveCalls(token);
    if (activeCalls.length === 0) {
      console.log('No active calls found');
      return;
    }
    
    console.log(`Found ${activeCalls.length} active calls`);
    
    // Process the first active call
    const call = activeCalls[0];
    console.log(`Processing call ${call.CallId}: ${call.Name}`);
    
    // Get extra data for the call
    const extraData = await getCallExtraData(token, call.CallId);
    if (!extraData) {
      console.log('Failed to get extra data for call');
      return;
    }
    
    // Check for unit data in call
    console.log('\nUnit Information:');
    console.log('UnitsCsv from call data:', call.UnitsCsv || 'Not present');
    
    // Check for unit dispatches in extra data
    if (extraData.Data && extraData.Data.Dispatches && Array.isArray(extraData.Data.Dispatches)) {
      const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
      console.log(`\nFound ${unitDispatches.length} unit dispatches in extra data:`);
      unitDispatches.forEach(unit => {
        console.log(`  - ${unit.Name || 'No name'} (ID: ${unit.Id || 'No ID'})`);
      });
    } else {
      console.log('\nNo unit dispatches found in extra data');
    }
    
    // Generate XML with debug enabled
    console.log('\nGenerating XML with unit names...');
    const xml = generateXML(call, extraData, true);
    
    // Extract EmsUnitCallSign from XML
    const unitCallSignMatch = /<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/g.exec(xml);
    if (unitCallSignMatch) {
      console.log('\nEmsUnitCallSign in XML:', unitCallSignMatch[1]);
    } else {
      console.log('\nEmsUnitCallSign not found in XML');
    }
    
    // Save the XML to a file for inspection
    const filename = `logs/test_unit_names_${Date.now()}.xml`;
    fs.writeFileSync(filename, xml);
    console.log(`\nSaved XML to ${filename}`);
    
    console.log('\nTest completed successfully');
  } catch (error) {
    console.error('Error in main function:', error.message);
  }
}

// Run the main function
main();