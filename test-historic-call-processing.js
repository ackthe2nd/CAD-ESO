/**
 * Historic Call Processing Test
 * Fetches Call 201108 by date range and processes through complete pipeline
 * One-press test to repopulate and fix call data using authentic Resgrid data
 */

require('dotenv').config();
const { sheetLog, sheetCallRow } = require('./src/sheets-logger');
const { getCallExtraData } = require('./src/resgrid-api');
const { getApiToken } = require('./src/token-manager');
const { generateXML } = require('./src/xml-generator');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Fetch historic calls by date range
 */
async function fetchCallsByDateRange(token, startDate, endDate) {
  console.log(`Fetching calls from ${startDate} to ${endDate}...`);
  
  // Try multiple endpoints that work for historic data
  const endpoints = [
    {
      url: 'https://api.resgrid.com/api/v4/Calls/GetCalls',
      params: { startDate, endDate },
      name: 'GetCalls with date range'
    },
    {
      url: `https://api.resgrid.com/api/v4/Calls/GetCallsForDate?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      name: 'GetCallsForDate'
    },
    {
      url: `https://api.resgrid.com/api/v4/Calls/GetCallsByDate?startDate=${encodeURIComponent(startDate)}`,
      name: 'GetCallsByDate'
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Trying ${endpoint.name}...`);
      
      const config = {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      };
      
      if (endpoint.params) {
        config.params = endpoint.params;
      }
      
      const response = await axios.get(endpoint.url, config);
      
      if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
        console.log(`✅ ${endpoint.name} returned ${response.data.Data.length} calls`);
        return response.data.Data;
      } else if (response.data && Array.isArray(response.data)) {
        console.log(`✅ ${endpoint.name} returned ${response.data.length} calls (direct array)`);
        return response.data;
      }
    } catch (error) {
      console.log(`❌ ${endpoint.name} failed: ${error.message}`);
    }
  }
  
  throw new Error('All historic call endpoints failed');
}

/**
 * Process historic call through complete pipeline
 */
async function processHistoricCall() {
  console.log('='.repeat(70));
  console.log('HISTORIC CALL PROCESSING TEST');
  console.log('Fetching Call 201108 by date range and processing complete pipeline');
  console.log('='.repeat(70));
  
  const targetCallId = '201108';
  const callDate = '2025-06-08'; // Date from Call Received Time
  
  try {
    await sheetLog(`Starting historic call processing test for Call ${targetCallId}`, 'info');
    
    console.log('\nStep 1: Getting API token...');
    const token = await getApiToken();
    console.log('✅ Obtained Resgrid API token');
    
    console.log('\nStep 2: Fetching historic calls by date range...');
    
    // Set date range around the known call date
    const startDate = `${callDate}T00:00:00.000Z`;
    const endDate = `${callDate}T23:59:59.999Z`;
    
    const calls = await fetchCallsByDateRange(token, startDate, endDate);
    
    if (!calls || calls.length === 0) {
      console.log('❌ No calls found in date range');
      await sheetLog(`No calls found for date ${callDate}`, 'warn', 'No Data');
      return;
    }
    
    console.log(`✅ Found ${calls.length} calls for ${callDate}`);
    
    // Find the target call
    const targetCall = calls.find(call => call.CallId.toString() === targetCallId);
    
    if (!targetCall) {
      console.log(`❌ Call ${targetCallId} not found in date range`);
      console.log('Available calls:');
      calls.forEach(call => {
        console.log(`  - Call ${call.CallId}: ${call.Name || 'Unknown'}`);
      });
      await sheetLog(`Call ${targetCallId} not found in date range`, 'warn', 'Call Not Found');
      return;
    }
    
    console.log(`\nStep 3: Found target Call ${targetCallId}: ${targetCall.Name}`);
    console.log(`   State: ${targetCall.State}`);
    console.log(`   Logged: ${targetCall.LoggedOn}`);
    console.log(`   Priority: ${targetCall.Priority}`);
    
    console.log('\nStep 4: Fetching call extra data...');
    const extraData = await getCallExtraData(targetCallId);
    
    if (!extraData || !extraData.Data) {
      throw new Error(`Could not fetch extra data for call ${targetCallId}`);
    }
    
    console.log(`✅ Fetched extra data with ${extraData.Data?.Activity?.length || 0} activities`);
    console.log(`   Dispatches: ${extraData.Data?.Dispatches?.length || 0} units`);
    
    console.log('\nStep 5: Generating XML...');
    const xmlResult = await generateXML(targetCall, extraData, true);
    if (!xmlResult) {
      throw new Error('Failed to generate XML');
    }
    
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    console.log(`✅ Generated XML (${xmlData.length} characters)`);
    
    console.log('\nStep 6: Preparing SFTP upload...');
    const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `call_${targetCallId}_historic_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    fs.writeFileSync(localFilePath, xmlData);
    console.log(`✅ Saved XML to: ${localFilePath}`);
    
    console.log('\nStep 7: Uploading to ESO SFTP...');
    let uploadSuccess = false;
    let uploadError = null;
    
    try {
      const FlyIoSftpClient = require('./src/fly-io-sftp-client');
      const config = require('./src/config').config;
      
      const remoteFilePath = path.join(config.sftp.remotePath, filename);
      const sftpClient = new FlyIoSftpClient();
      
      await sftpClient.uploadFile(localFilePath, remoteFilePath);
      uploadSuccess = true;
      console.log(`✅ Successfully uploaded to ESO: ${remoteFilePath}`);
      
      await sheetLog(`XML file uploaded to sftp.esosuite.net: ${filename} for Call ID: ${targetCallId}`, 'info', `Call ID ${targetCallId} - Historic Processing Upload Successful`, xmlData);
      
    } catch (error) {
      uploadError = error.message;
      console.log(`❌ SFTP upload failed: ${error.message}`);
      
      await sheetLog(`Failed to upload XML file to sftp.esosuite.net: ${filename} for Call ID: ${targetCallId}`, 'error', `Call ID ${targetCallId} - Historic Processing Upload Failed`, xmlData);
    }
    
    console.log('\nStep 8: Updating Google Sheets with smart field preservation...');
    
    const uploadStatus = uploadSuccess ? 'Historic Processing - XML Upload Successful' : `Historic Processing - Upload Failed: ${uploadError}`;
    const uploadUrl = uploadSuccess ? `sftp.esosuite.net${path.join(config.sftp.remotePath, filename)}` : '';
    
    await sheetCallRow(
      targetCall,
      extraData,
      uploadStatus,
      uploadUrl,
      xmlData
    );
    
    console.log('✅ Updated Google Sheets with smart field preservation');
    
    // Cleanup
    try {
      fs.unlinkSync(localFilePath);
      console.log('✅ Cleaned up temporary file');
    } catch (error) {
      console.log(`Warning: Could not cleanup temp file: ${error.message}`);
    }
    
    console.log('\n--- HISTORIC PROCESSING RESULTS ---');
    console.log(`Call ID: ${targetCallId}`);
    console.log(`Call Name: ${targetCall.Name}`);
    console.log(`Call State: ${targetCall.State}`);
    console.log(`Call Date: ${targetCall.LoggedOn}`);
    console.log(`XML Generated: Yes (${xmlData.length} characters)`);
    console.log(`SFTP Upload: ${uploadSuccess ? 'Successful' : 'Failed'}`);
    console.log(`Google Sheets: Updated with field preservation`);
    if (uploadError) {
      console.log(`Upload Error: ${uploadError}`);
    }
    
    console.log('\nVerification complete');
    console.log('Check your Google Sheets Call Data tab for updated information');
    console.log(`Look for Emergency Call ID: ${targetCallId}`);
    console.log('All fields should be properly populated with smart field preservation');
    
    await sheetLog(`Historic processing test completed for Call ${targetCallId}`, 'info', uploadSuccess ? 'Test Successful' : 'Test Partial Success');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    await sheetLog(`Historic processing test failed: ${error.message}`, 'error', 'Test Failed');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('HISTORIC CALL PROCESSING TEST COMPLETED');
  console.log('='.repeat(70));
}

// Run the test
processHistoricCall().catch(console.error);