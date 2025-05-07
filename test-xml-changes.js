/**
 * Test XML Changes - EMD_Performed Removal Verification
 * 
 * This script tests the XML generation to verify that the EMD_Performed 
 * tag has been properly removed from the output.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');

// Configuration
const API_BASE_URL = 'https://api.resgrid.com/api/v4';
const RECENT_CALL_ID = '198513'; // Use a recent call ID for testing
const OUTPUT_FILE = path.join(__dirname, 'test-output', 'xml-test-output.xml');

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  try {
    const RESGRID_USER = process.env.RESGRID_USER;
    const RESGRID_PASS = process.env.RESGRID_PASS;
    
    console.log('Getting API token...');
    
    const tokenResponse = await axios.post(
      `${API_BASE_URL}/Connect/token`,
      `grant_type=password&username=${encodeURIComponent(RESGRID_USER)}&password=${encodeURIComponent(RESGRID_PASS)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Successfully obtained API token');
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error('Error getting token:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Fetch call data from Resgrid API
 */
async function getCallData(token, callId) {
  try {
    console.log(`Fetching data for call ${callId}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/Calls/GetCall?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data.Data;
  } catch (error) {
    console.error(`Error fetching call data: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Fetch extra call data from Resgrid API
 */
async function getCallExtraData(token, callId) {
  try {
    console.log(`Fetching extra data for call ${callId}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/Calls/GetCallExtraData?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data.Data;
  } catch (error) {
    console.error(`Error fetching call extra data: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Main test function
 */
async function runTest() {
  try {
    console.log('Starting XML changes verification test...');
    
    // Create output directory if it doesn't exist
    const outputDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`Created directory: ${outputDir}`);
    }
    
    // Get API token
    const token = await getApiToken();
    
    // Get call data
    const callData = await getCallData(token, RECENT_CALL_ID);
    if (!callData) {
      console.error('Failed to fetch call data, aborting test');
      return;
    }
    
    // Get extra call data
    const extraData = await getCallExtraData(token, RECENT_CALL_ID);
    if (!extraData) {
      console.error('Failed to fetch call extra data, continuing with basic data only');
    }
    
    // Generate XML
    console.log('Generating XML...');
    const xml = generateXML(callData, extraData, true);
    
    // Save XML to file
    fs.writeFileSync(OUTPUT_FILE, xml);
    console.log(`XML saved to ${OUTPUT_FILE}`);
    
    // Check for EMD_Performed tag
    if (xml.includes('EMD_Performed')) {
      console.error('❌ TEST FAILED: EMD_Performed tag found in XML output');
      
      // Find the line with EMD_Performed
      const lines = xml.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('EMD_Performed')) {
          console.error(`  Found at line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    } else {
      console.log('✅ TEST PASSED: EMD_Performed tag is not present in XML output');
    }
    
    // Display XML snippet
    console.log('\nXML Output Snippet:');
    const lines = xml.split('\n');
    const startLine = Math.max(0, lines.findIndex(line => line.includes('<ResponseModeToScene>')) - 2);
    const endLine = Math.min(lines.length - 1, startLine + 8);
    
    for (let i = startLine; i <= endLine; i++) {
      console.log(`  ${lines[i]}`);
    }
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error(`Error running test: ${error.message}`);
  }
}

// Run the test
runTest();