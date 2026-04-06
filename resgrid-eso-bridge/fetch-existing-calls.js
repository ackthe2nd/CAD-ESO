require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');
const SftpClient = require('ssh2-sftp-client');
const { create } = require('xmlbuilder2');

// Load environment variables, supporting both naming conventions
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;
const SFTP_HOST = process.env.SFTP_HOST;
const SFTP_USER = process.env.SFTP_USER || process.env.SFTP_USERNAME;
const SFTP_PASS = process.env.SFTP_PASS || process.env.SFTP_PASSWORD;
const SFTP_DIR = process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH;

// Create temp directory for storing XML files
const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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
 * Fetches detailed call data from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object>} The detailed call data
 */
async function getCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for Call ID: ${callId}`);
    
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/GetCallExtraData',
      {
        params: { callId },
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    if (response.status === 200) {
      log(`Successfully fetched data for Call ID: ${callId}`);
      return response.data;
    } else {
      throw new Error(`API returned status ${response.status} for call ${callId}`);
    }
  } catch (error) {
    log(`API Error for Call ID: ${callId}: ${error.message}`, true);
    if (error.response) {
      log(`Error details: ${JSON.stringify(error.response.data, null, 2)}`, true);
    }
    throw error;
  }
}

/**
 * Generates XML for ESO from call data
 */
function generateXML(callData) {
  try {
    log(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Create XML document
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt(`b394de98-a5b7-408d-a1f2-020eddff92b9`).up()
        .ele('IncidentNumber').txt(callData.CallId).up()
        .ele('IncidentOrOnset').txt(callData.Timestamp || new Date().toISOString()).up()
        .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up()
        .ele('VehicleDispatchLocation').txt(callData.Address || '').up()
        .ele('EmsUnitCallSign').txt(callData.UnitsCsv || '').up()
        .ele('CadDispatchText').txt(callData.Notes || '').up()
      .doc();
    
    return doc.end({ prettyPrint: true });
  } catch (error) {
    log(`Error generating XML: ${error.message}`, true);
    throw error;
  }
}

/**
 * Uploads a file to ESO via SFTP
 */
async function uploadToSFTP(localFilePath, remoteFilePath) {
  const sftp = new SftpClient();
  
  try {
    log(`Connecting to SFTP server at ${SFTP_HOST}`);
    
    await sftp.connect({
      host: SFTP_HOST,
      port: 22, // Default SFTP port
      username: SFTP_USER,
      password: SFTP_PASS
    });
    
    // Check if remote directory exists and create if needed
    const dirExists = await sftp.exists(SFTP_DIR);
    if (!dirExists) {
      log(`Creating remote directory: ${SFTP_DIR}`);
      await sftp.mkdir(SFTP_DIR, true);
    }
    
    // Upload the file
    await sftp.put(localFilePath, remoteFilePath);
    log(`File uploaded successfully to ${remoteFilePath}`);
    
    return true;
  } catch (error) {
    log(`SFTP upload failed: ${error.message}`, true);
    throw error;
  } finally {
    // Always disconnect
    await sftp.end();
  }
}

/**
 * Process a single call from Resgrid
 * @param {string} token - The API token for authentication
 * @param {Object} call - The basic call data
 * @returns {Promise<boolean>} Success status
 */
async function processCall(token, call) {
  try {
    log(`Processing call ID: ${call.CallId}`);
    
    // Fetch extra data from Resgrid API
    const callExtraData = await getCallExtraData(token, call.CallId);
    
    // Extract unit names from dispatches
    let unitsCsv = '';
    if (callExtraData.Dispatches && Array.isArray(callExtraData.Dispatches)) {
      const unitDispatches = callExtraData.Dispatches.filter(d => d.Type === "Unit");
      unitsCsv = unitDispatches.map(d => d.Name).join(', ');
    }
    
    // Generate XML
    const xmlData = generateXML({
      CallId: call.CallId,
      Timestamp: call.LoggedOn || new Date().toISOString(),
      Nature: call.Name || callExtraData.Nature || '',
      Address: call.Address || callExtraData.Address || '',
      UnitsCsv: unitsCsv,
      Notes: call.Notes || callExtraData.Notes || ''
    });
    
    // Save XML to temp file
    const tempFilePath = path.join(tempDir, `incident_${call.CallId}.xml`);
    fs.writeFileSync(tempFilePath, xmlData);
    
    // Upload to SFTP server
    const remoteFilePath = `${SFTP_DIR}/incident_${call.CallId}.xml`;
    await uploadToSFTP(tempFilePath, remoteFilePath);
    
    // Clean up temp file
    fs.unlinkSync(tempFilePath);
    
    log(`✅ Successfully processed call ${call.CallId}`);
    return true;
  } catch (error) {
    log(`❌ Error processing call ${call.CallId}: ${error.message}`, true);
    return false;
  }
}

/**
 * Main function to process all recent calls
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
    
    if (!SFTP_HOST || !SFTP_USER || !SFTP_PASS || !SFTP_DIR) {
      log('Missing required SFTP configuration (SFTP_HOST, SFTP_USER/USERNAME, SFTP_PASS/PASSWORD, SFTP_DIR/REMOTE_PATH)', true);
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
    
    log(`Beginning to process ${calls.length} calls...`);
    
    // Process each call
    let successCount = 0;
    let failureCount = 0;
    
    for (const call of calls) {
      try {
        const success = await processCall(token, call);
        if (success) {
          successCount++;
        } else {
          failureCount++;
        }
      } catch (error) {
        log(`Failed to process call ${call.CallId}: ${error.message}`, true);
        failureCount++;
      }
    }
    
    log(`Completed processing ${calls.length} calls.`);
    log(`✅ Successful: ${successCount}`);
    log(`❌ Failed: ${failureCount}`);
    
  } catch (error) {
    log(`Failed to process calls: ${error.message}`, true);
    process.exit(1);
  }
}

// Start the process
log('Starting to fetch existing Resgrid calls...');
main().catch(error => {
  log(`Unhandled error: ${error.message}`, true);
  process.exit(1);
});