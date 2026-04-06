/**
 * Complete Call 201108 Processing Test
 * Simulates normal operation by processing a specific call through the entire pipeline:
 * 1. Fetch real call data from Resgrid API
 * 2. Generate XML with proper formatting
 * 3. Upload to ESO via SFTP
 * 4. Log to Google Sheets with smart field preservation
 * 
 * This serves as a one-press test to repopulate and fix call data
 */

require('dotenv').config();
const { sheetLog } = require('./src/sheets-logger');
const { getCallExtraData } = require('./src/resgrid-api');
const { getApiToken } = require('./src/token-manager');
const { generateXML } = require('./src/xml-generator');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Test complete processing of Call 201108
 */
async function testCompleteCall201108Processing() {
  console.log('='.repeat(70));
  console.log('COMPLETE CALL 201108 PROCESSING TEST');
  console.log('Testing normal operation with real Resgrid data');
  console.log('='.repeat(70));
  
  const targetCallId = '201192';
  
  try {
    await sheetLog(`Starting complete processing test for Call ${targetCallId}`, 'info');
    
    console.log(`\nStep 1: Fetching real data for Call ${targetCallId} from Resgrid...`);
    
    // Get API token
    const token = await getApiToken();
    console.log('✅ Obtained Resgrid API token');
    
    // Fetch call data using the same method as normal operation
    const callResponse = await axios({
      method: 'GET',
      url: `https://api.resgrid.com/api/v4/Calls/GetCallById?callId=${targetCallId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!callResponse || !callResponse.data || !callResponse.data.Data) {
      throw new Error(`Could not fetch call ${targetCallId} from Resgrid`);
    }
    
    const callData = callResponse.data.Data;
    console.log(`✅ Fetched call data: ${callData.Name || 'Unknown Call'}`);
    console.log(`   State: ${callData.State}`);
    console.log(`   Logged: ${callData.LoggedOn}`);
    
    // Fetch extra data
    console.log('\nStep 2: Fetching detailed call information...');
    const extraData = await getCallExtraData(targetCallId);
    
    if (!extraData || !extraData.Data) {
      throw new Error(`Could not fetch extra data for call ${targetCallId}`);
    }
    console.log(`✅ Fetched extra data with ${extraData.Data?.Activity?.length || 0} activities`);
    console.log(`   Dispatches: ${extraData.Data?.Dispatches?.length || 0} units`);
    
    // Step 3: Generate XML using the same process as normal operation
    console.log('\nStep 3: Generating XML with proper formatting...');
    
    const xmlResult = await generateXML(callData, extraData, true);
    if (!xmlResult) {
      throw new Error('Failed to generate XML');
    }
    
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    console.log(`✅ Generated XML (${xmlData.length} characters)`);
    
    // Step 4: Save XML temporarily
    console.log('\nStep 4: Preparing for SFTP upload...');
    const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `call_${targetCallId}_test_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    fs.writeFileSync(localFilePath, xmlData);
    console.log(`✅ Saved XML to: ${localFilePath}`);
    
    // Step 5: Upload to ESO SFTP (using the same logic as normal operation)
    console.log('\nStep 5: Uploading to ESO SFTP server...');
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
      
    } catch (error) {
      uploadError = error.message;
      console.log(`❌ SFTP upload failed: ${error.message}`);
    }
    
    // Step 6: Log to Google Sheets with smart field preservation
    console.log('\nStep 6: Logging to Google Sheets with field preservation...');
    const { sheetCallRow } = require('./src/sheets-logger');
    
    const uploadStatus = uploadSuccess ? 'Test Complete - XML Upload Successful' : `Test Complete - Upload Failed: ${uploadError}`;
    
    await sheetCallRow(
      callData,
      extraData,
      uploadStatus,
      uploadSuccess ? `sftp.esosuite.net${path.join(config.sftp.remotePath, filename)}` : '',
      xmlData
    );
    
    console.log('✅ Logged to Google Sheets with smart field preservation');
    
    // Cleanup
    try {
      fs.unlinkSync(localFilePath);
      console.log('✅ Cleaned up temporary file');
    } catch (error) {
      console.log(`Warning: Could not cleanup temp file: ${error.message}`);
    }
    
    const result = {
      success: true,
      xmlGenerated: true,
      xmlLength: xmlData.length,
      sftpUpload: uploadSuccess,
      sheetsLogged: true,
      uploadError: uploadError
    };
    
    console.log('\nStep 7: Verification complete');
    console.log('Check your Google Sheets Call Data tab for updated information');
    console.log(`Look for Emergency Call ID: ${targetCallId}`);
    console.log('All fields should be properly populated with preservation of existing data');
    
    console.log('\n--- PROCESSING RESULTS ---');
    console.log(`XML Generated: ${result.xmlGenerated ? 'Yes' : 'No'} (${result.xmlLength} chars)`);
    console.log(`SFTP Upload: ${result.sftpUpload ? 'Successful' : 'Failed'}`);
    console.log(`Google Sheets: ${result.sheetsLogged ? 'Updated' : 'Failed'}`);
    if (result.uploadError) {
      console.log(`Upload Error: ${result.uploadError}`);
    }
    
    await sheetLog(`Complete processing test for Call ${targetCallId} finished`, 'info', result.success ? 'Test Successful' : 'Test Failed');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Full error:', error);
    await sheetLog(`Complete processing test for Call ${targetCallId} failed: ${error.message}`, 'error', 'Test Failed');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('COMPLETE CALL 201108 PROCESSING TEST FINISHED');
  console.log('='.repeat(70));
}

// Run the test
testCompleteCall201108Processing().catch(console.error);