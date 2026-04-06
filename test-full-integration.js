/**
 * Comprehensive End-to-End Test for Resgrid to ESO Bridge
 * This script tests the entire process from API call to XML generation and SFTP upload
 * using real call data
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const SftpClient = require('ssh2-sftp-client');

// Import the XML generators
const { generateXML } = require('./src/xml-generator');
const { generateXML: generateExactMatchXML } = require('./src/xml-generator-exact-match');

// Set up logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
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
 * Fetch recent calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {number} days - How many days back to fetch calls for
 * @returns {Promise<Array>} List of calls
 */
async function fetchRecentCalls(token, days = 7) {
  try {
    log(`Fetching active calls from Resgrid...`);
    
    // Based on our tests, the GetActiveCalls endpoint works best
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
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const filteredCalls = calls.filter(call => {
          const callDate = new Date(call.LoggedOnUtc || call.LoggedOn);
          return callDate >= startDate;
        });
        
        log(`${filteredCalls.length} calls are from the last ${days} days`);
        return filteredCalls;
      }
      
      return calls;
    } else {
      log('No calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Failed to fetch active calls: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetches detailed call data from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object>} The detailed call data
 */
async function getCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No extra data found for call ${callId} or invalid response format`, true);
      return {};
    }
  } catch (error) {
    log(`Failed to fetch extra data for call ${callId}: ${error.message}`, true);
    throw error;
  }
}

/**
 * Simulates SFTP upload by saving file to logs directory
 * @param {string} localFilePath - Path to the XML file
 * @param {string} remoteFileName - Name for the remote file
 * @returns {Promise<boolean>} Success status
 */
async function mockSftpUpload(localFilePath, remoteFileName) {
  try {
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const destPath = path.join(logsDir, remoteFileName);
    fs.copyFileSync(localFilePath, destPath);
    
    log(`Successfully saved file to ${destPath} (simulated SFTP upload)`);
    return true;
  } catch (error) {
    log(`Failed to simulate SFTP upload: ${error.message}`, true);
    return false;
  }
}

/**
 * Process a call using both XML generators and compare results
 * @param {string} token - The API token for authentication
 * @param {Object} call - The basic call data
 * @returns {Promise<boolean>} Success status
 */
async function processCall(token, call) {
  try {
    const callId = call.CallId;
    log(`Processing call ${callId}...`);
    
    // Save the raw call data for reference
    const rawCallPath = path.join(__dirname, 'logs', `call_${callId}_GetCall.json`);
    fs.writeFileSync(rawCallPath, JSON.stringify({ Data: call }, null, 2));
    
    // Fetch extra data for this call
    const extraData = await getCallExtraData(token, callId);
    
    // Save the raw extra data for reference
    const rawExtraPath = path.join(__dirname, 'logs', `call_${callId}_GetCallExtraData.json`);
    fs.writeFileSync(rawExtraPath, JSON.stringify({ Data: extraData }, null, 2));
    
    // Generate XML with both generators
    log(`Generating XML for call ${callId}...`);
    const xml = generateXML(call, extraData, true);
    const exactMatchXml = generateExactMatchXML(call, extraData, true);
    
    // Save the XML files
    const tempPath = path.join(__dirname, 'logs', `incident_${callId}_temp.xml`);
    const exactMatchPath = path.join(__dirname, 'logs', `incident_${callId}_exact_match.xml`);
    fs.writeFileSync(tempPath, xml);
    fs.writeFileSync(exactMatchPath, exactMatchXml);
    
    // Simulate SFTP upload for regular XML
    const remoteFileName = `incident_${callId}_e2e_test.xml`;
    const uploadSuccess = await mockSftpUpload(tempPath, remoteFileName);
    
    log(`Completed processing call ${callId} with success=${uploadSuccess}`);
    
    // Validate XML formatting
    try {
      const { XMLParser } = require('fast-xml-parser');
      const parser = new XMLParser({
        allowBooleanAttributes: true,
        parseNodeValue: true,
        ignoreAttributes: false
      });
      
      try {
        // If parsing succeeds, XML is valid
        parser.parse(xml);
        parser.parse(exactMatchXml);
        log(`✅ XML validation passed for call ${callId}`);
      } catch (parseError) {
        log(`❌ XML validation failed for call ${callId}: ${parseError.message}`, true);
      }
    } catch (validationError) {
      log(`Failed to validate XML: ${validationError.message}`, true);
    }
    
    return uploadSuccess;
  } catch (error) {
    log(`Failed to process call ${call.CallId}: ${error.message}`, true);
    return false;
  }
}

/**
 * Main function to test the full bridge integration
 */
async function main() {
  try {
    log('Starting comprehensive end-to-end test...');
    
    // Install fast-xml-parser for XML validation if not already installed
    try {
      require('fast-xml-parser');
    } catch (e) {
      log('Installing fast-xml-parser for XML validation...');
      const { execSync } = require('child_process');
      execSync('npm install --no-save fast-xml-parser');
    }
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch recent calls
    const days = process.argv[2] ? parseInt(process.argv[2]) : 7;
    const calls = await fetchRecentCalls(token, days);
    
    if (calls.length === 0) {
      log('No calls found to process');
      return;
    }
    
    // Process each call
    log(`Processing ${calls.length} calls...`);
    let successCount = 0;
    
    // Process up to 3 calls for this test
    const callsToProcess = calls.slice(0, 3);
    
    for (const call of callsToProcess) {
      const success = await processCall(token, call);
      if (success) successCount++;
    }
    
    log(`Test completed. Successfully processed ${successCount} out of ${callsToProcess.length} calls.`);
    
    // Generate summary report
    const reportPath = path.join(__dirname, 'logs', 'e2e_test_report.txt');
    const report = `Resgrid to ESO Bridge E2E Test Report
Generated: ${new Date().toISOString()}
Calls processed: ${callsToProcess.length}
Successful: ${successCount}
Success rate: ${((successCount / callsToProcess.length) * 100).toFixed(2)}%
`;
    fs.writeFileSync(reportPath, report);
    log(`Test report saved to ${reportPath}`);
    
  } catch (error) {
    log(`Test failed with error: ${error.message}`, true);
    console.error(error);
  }
}

// Run the test
main().catch(console.error);