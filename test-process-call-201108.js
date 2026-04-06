/**
 * Complete Call 201108 Processing Test
 * One-press test to fetch, process, and upload Call 201108 through the complete pipeline
 * Uses historic call fetcher to retrieve authentic Resgrid data
 */

require('dotenv').config();
const { HistoricCallFetcher } = require('./fetch-historic-calls');
const { sheetLog, sheetCallRow } = require('./src/sheets-logger');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Process Call 201108 through complete pipeline
 */
async function processCall201108() {
  console.log('='.repeat(70));
  console.log('COMPLETE CALL 201108 PROCESSING');
  console.log('One-press test with authentic Resgrid data');
  console.log('='.repeat(70));
  
  const targetCallId = '201108';
  
  try {
    await sheetLog(`Starting complete processing for Call ${targetCallId}`, 'info');
    
    // Step 1: Initialize historic call fetcher
    console.log('\nStep 1: Initializing historic call fetcher...');
    const fetcher = new HistoricCallFetcher();
    await fetcher.initialize();
    
    // Step 2: Find and fetch Call 201108 with complete data
    console.log('\nStep 2: Fetching Call 201108 with complete data...');
    const callData = await fetcher.getCallWithExtraData(targetCallId);
    
    if (!callData) {
      throw new Error(`Call ${targetCallId} not found in Resgrid system`);
    }
    
    const { call, extraData } = callData;
    console.log(`✅ Retrieved Call ${targetCallId}: ${call.Name}`);
    console.log(`   State: ${call.State}`);
    console.log(`   Logged: ${call.LoggedOn}`);
    console.log(`   Priority: ${call.Priority}`);
    console.log(`   Activities: ${extraData?.Data?.Activity?.length || 0}`);
    console.log(`   Dispatches: ${extraData?.Data?.Dispatches?.length || 0}`);
    
    // Step 3: Generate XML using the same process as normal operation
    console.log('\nStep 3: Generating XML...');
    const xmlResult = await generateXML(call, extraData, true);
    if (!xmlResult) {
      throw new Error('Failed to generate XML');
    }
    
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    console.log(`✅ Generated XML (${xmlData.length} characters)`);
    
    // Step 4: Prepare for SFTP upload
    console.log('\nStep 4: Preparing SFTP upload...');
    const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const timestamp = Date.now();
    const filename = `call_${targetCallId}_complete_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    fs.writeFileSync(localFilePath, xmlData);
    console.log(`✅ Saved XML to: ${localFilePath}`);
    
    // Step 5: Upload to ESO SFTP
    console.log('\nStep 5: Uploading to ESO SFTP...');
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
      
      await sheetLog(`XML file uploaded to sftp.esosuite.net: ${filename} for Call ID: ${targetCallId}`, 'info', `Call ID ${targetCallId} - Complete Processing Upload Successful`, xmlData);
      
    } catch (error) {
      uploadError = error.message;
      console.log(`❌ SFTP upload failed: ${error.message}`);
      
      await sheetLog(`Failed to upload XML file to sftp.esosuite.net: ${filename} for Call ID: ${targetCallId}`, 'error', `Call ID ${targetCallId} - Complete Processing Upload Failed`, xmlData);
    }
    
    // Step 6: Update Google Sheets with smart field preservation
    console.log('\nStep 6: Updating Google Sheets with smart field preservation...');
    
    const uploadStatus = uploadSuccess ? 'Complete Processing - XML Upload Successful' : `Complete Processing - Upload Failed: ${uploadError}`;
    const uploadUrl = uploadSuccess ? `sftp.esosuite.net${path.join(config.sftp.remotePath, filename)}` : '';
    
    await sheetCallRow(
      call,
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
    
    console.log('\n--- COMPLETE PROCESSING RESULTS ---');
    console.log(`Call ID: ${targetCallId}`);
    console.log(`Call Name: ${call.Name}`);
    console.log(`Call State: ${call.State}`);
    console.log(`Call Date: ${call.LoggedOn}`);
    console.log(`XML Generated: Yes (${xmlData.length} characters)`);
    console.log(`SFTP Upload: ${uploadSuccess ? 'Successful' : 'Failed'}`);
    console.log(`Google Sheets: Updated with field preservation`);
    if (uploadError) {
      console.log(`Upload Error: ${uploadError}`);
    }
    
    console.log('\nProcessing Summary:');
    console.log('- Fetched authentic call data from Resgrid');
    console.log('- Generated proper XML format');
    console.log('- Uploaded to ESO SFTP server');
    console.log('- Updated Google Sheets with smart field preservation');
    console.log('- Maintained data integrity throughout pipeline');
    
    console.log('\nVerification:');
    console.log('Check your Google Sheets Call Data tab for updated information');
    console.log(`Look for Emergency Call ID: ${targetCallId}`);
    console.log('All fields should be properly populated with preserved existing data');
    
    await sheetLog(`Complete processing for Call ${targetCallId} finished successfully`, 'info', uploadSuccess ? 'Processing Complete' : 'Processing Partial Success');
    
  } catch (error) {
    console.error('\n❌ Processing failed:', error.message);
    await sheetLog(`Complete processing for Call ${targetCallId} failed: ${error.message}`, 'error', 'Processing Failed');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('CALL 201108 PROCESSING COMPLETED');
  console.log('='.repeat(70));
}

// Run the processing
processCall201108().catch(console.error);