/**
 * Reprocess Existing Call Test
 * Uses the same methods as normal operation to fetch and reprocess an active call
 * This is a one-press test to repopulate and fix call data
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
 * Reprocess an existing call using the same methods as normal operation
 */
async function reprocessExistingCall() {
  console.log('='.repeat(70));
  console.log('REPROCESS EXISTING CALL TEST');
  console.log('Using same methods as normal operation');
  console.log('='.repeat(70));
  
  try {
    await sheetLog('Starting reprocess existing call test', 'info');
    
    console.log('\nStep 1: Fetching active calls (same as normal operation)...');
    
    // Get API token using the same method
    const token = await getApiToken();
    console.log('✅ Obtained Resgrid API token');
    
    // Fetch active calls using the same endpoint as normal operation
    const response = await axios({
      method: 'GET',
      url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || response.data.Data.length === 0) {
      console.log('❌ No active calls found');
      await sheetLog('No active calls found for reprocessing', 'warn', 'No Data');
      return;
    }
    
    const calls = response.data.Data;
    console.log(`✅ Found ${calls.length} active calls`);
    
    // Use the first active call for testing
    const testCall = calls[0];
    console.log(`\nStep 2: Processing Call ${testCall.CallId}: ${testCall.Name}`);
    console.log(`   State: ${testCall.State}`);
    console.log(`   Logged: ${testCall.LoggedOn}`);
    
    // Fetch extra data using the same method as normal operation
    console.log('\nStep 3: Fetching extra data...');
    const extraData = await getCallExtraData(testCall.CallId);
    
    if (!extraData || !extraData.Data) {
      throw new Error(`Could not fetch extra data for call ${testCall.CallId}`);
    }
    
    console.log(`✅ Fetched extra data with ${extraData.Data?.Activity?.length || 0} activities`);
    console.log(`   Dispatches: ${extraData.Data?.Dispatches?.length || 0} units`);
    
    // Step 4: Generate XML using the same process as normal operation
    console.log('\nStep 4: Generating XML...');
    
    const xmlResult = await generateXML(testCall, extraData, true);
    if (!xmlResult) {
      throw new Error('Failed to generate XML');
    }
    
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    console.log(`✅ Generated XML (${xmlData.length} characters)`);
    
    // Step 5: Prepare for SFTP upload
    console.log('\nStep 5: Preparing SFTP upload...');
    const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `call_${testCall.CallId}_reprocess_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    fs.writeFileSync(localFilePath, xmlData);
    console.log(`✅ Saved XML to: ${localFilePath}`);
    
    // Step 6: Upload to ESO SFTP
    console.log('\nStep 6: Uploading to ESO SFTP...');
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
      
      // Log successful upload
      await sheetLog(`XML file uploaded to sftp.esosuite.net: ${filename} for Call ID: ${testCall.CallId}`, 'info', `Call ID ${testCall.CallId} - Reprocess Upload Successful`, xmlData);
      
    } catch (error) {
      uploadError = error.message;
      console.log(`❌ SFTP upload failed: ${error.message}`);
      
      // Log failed upload
      await sheetLog(`Failed to upload XML file to sftp.esosuite.net: ${filename} for Call ID: ${testCall.CallId}`, 'error', `Call ID ${testCall.CallId} - Reprocess Upload Failed`, xmlData);
    }
    
    // Step 7: Update Google Sheets with smart field preservation
    console.log('\nStep 7: Updating Google Sheets with field preservation...');
    
    const uploadStatus = uploadSuccess ? 'Reprocess Test - XML Upload Successful' : `Reprocess Test - Upload Failed: ${uploadError}`;
    const uploadUrl = uploadSuccess ? `sftp.esosuite.net${path.join(config.sftp.remotePath, filename)}` : '';
    
    await sheetCallRow(
      testCall,
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
    
    console.log('\n--- REPROCESSING RESULTS ---');
    console.log(`Call ID: ${testCall.CallId}`);
    console.log(`Call Name: ${testCall.Name}`);
    console.log(`XML Generated: Yes (${xmlData.length} characters)`);
    console.log(`SFTP Upload: ${uploadSuccess ? 'Successful' : 'Failed'}`);
    console.log(`Google Sheets: Updated with field preservation`);
    if (uploadError) {
      console.log(`Upload Error: ${uploadError}`);
    }
    
    console.log('\nVerification complete');
    console.log('Check your Google Sheets Call Data tab for updated information');
    console.log(`Look for Emergency Call ID: ${testCall.CallId}`);
    console.log('All fields should be properly populated with preservation of existing data');
    
    await sheetLog(`Reprocess test completed for Call ${testCall.CallId}`, 'info', uploadSuccess ? 'Test Successful' : 'Test Partial Success');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await sheetLog(`Reprocess test failed: ${error.message}`, 'error', 'Test Failed');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('REPROCESS EXISTING CALL TEST COMPLETED');
  console.log('='.repeat(70));
}

// Run the test
reprocessExistingCall().catch(console.error);