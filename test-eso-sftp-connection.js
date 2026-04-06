/**
 * Test ESO SFTP Connection with Real Credentials
 * Validates connection, directory access, and file upload functionality
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

async function testESOConnection() {
  console.log('=== ESO SFTP Connection Test ===\n');
  
  // Configuration
  const config = {
    host: process.env.SFTP_HOST || 'sftp.esosuite.net',
    port: 22,
    username: process.env.SFTP_USER || 'CA-EMS',
    password: process.env.SFTP_PASS,
    remotePath: process.env.SFTP_DIR || '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9'
  };
  
  console.log(`Host: ${config.host}`);
  console.log(`Username: ${config.username}`);
  console.log(`Remote Directory: ${config.remotePath}\n`);
  
  const sftp = new SftpClient();
  
  try {
    console.log('Step 1: Connecting to ESO SFTP server...');
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 30000,
      retries: 3,
      retry_factor: 2,
      retry_minTimeout: 2000
    });
    console.log('✅ Connected successfully\n');
    
    console.log('Step 2: Checking remote directory access...');
    const dirExists = await sftp.exists(config.remotePath);
    if (dirExists) {
      console.log('✅ Remote directory accessible');
      
      // List directory contents
      const dirList = await sftp.list(config.remotePath);
      console.log(`Directory contains ${dirList.length} items:`);
      dirList.forEach(item => {
        console.log(`  - ${item.name} (${item.type})`);
      });
    } else {
      console.log('❌ Remote directory not accessible');
      return false;
    }
    console.log();
    
    console.log('Step 3: Creating test XML file...');
    const testXml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>TEST-${Date.now()}</IncidentNumber>
  <IncidentOrOnset>${new Date().toISOString()}</IncidentOrOnset>
  <CallNature>TEST-CONNECTION</CallNature>
  <IncidentAddress1>Test Connection</IncidentAddress1>
  <IncidentCity>Test City</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>90210</IncidentZip>
  <CadDispatchText>SFTP Connection Test</CadDispatchText>
  <EmsUnitCallSign>TEST-UNIT</EmsUnitCallSign>
  <UnitNotifiedByDispatch>${new Date().toISOString()}</UnitNotifiedByDispatch>
  <ResponseModeToScene>395</ResponseModeToScene>
</CadIncident>`;
    
    const testFileName = `test-connection-${Date.now()}.xml`;
    const localTestFile = path.join(__dirname, testFileName);
    fs.writeFileSync(localTestFile, testXml);
    console.log(`✅ Created test file: ${testFileName}\n`);
    
    console.log('Step 4: Uploading test file to ESO...');
    const remoteTestFile = `${config.remotePath}/${testFileName}`;
    await sftp.put(localTestFile, remoteTestFile);
    console.log(`✅ File uploaded successfully to: ${remoteTestFile}\n`);
    
    console.log('Step 5: Verifying upload...');
    const uploadedFileExists = await sftp.exists(remoteTestFile);
    if (uploadedFileExists) {
      console.log('✅ Upload verified - file exists on ESO server');
      
      // Get file stats
      const fileStats = await sftp.stat(remoteTestFile);
      console.log(`File size: ${fileStats.size} bytes`);
      console.log(`Upload time: ${new Date(fileStats.mtime)}`);
    } else {
      console.log('❌ Upload verification failed');
      return false;
    }
    console.log();
    
    console.log('Step 6: Cleaning up test file...');
    await sftp.delete(remoteTestFile);
    fs.unlinkSync(localTestFile);
    console.log('✅ Test files cleaned up\n');
    
    console.log('=== CONNECTION TEST SUCCESSFUL ===');
    console.log('ESO SFTP connection is working correctly with the provided credentials.');
    console.log('The system can now upload XML files to ESO for emergency call data.');
    
    return true;
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error(`Error: ${error.message}`);
    
    if (error.message.includes('authentication')) {
      console.error('\nAuthentication failed. Please verify:');
      console.error(`- Username: ${process.env.SFTP_USER}`);
      console.error('- Password: check SFTP_PASS environment variable');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\nNetwork error. Please verify:');
      console.error('- Host: sftp.esosuite.net');
      console.error('- Port: 22');
      console.error('- Internet connectivity');
    } else if (error.message.includes('permission')) {
      console.error('\nPermission error. Please verify:');
      console.error('- Directory access rights');
      console.error('- File upload permissions');
    }
    
    return false;
  } finally {
    try {
      await sftp.end();
      console.log('\nSFTP connection closed.');
    } catch (endError) {
      console.warn(`Warning: Error closing connection: ${endError.message}`);
    }
  }
}

// Run the test
if (require.main === module) {
  testESOConnection()
    .then(success => {
      console.log(`\nTest completed with result: ${success ? 'SUCCESS' : 'FAILURE'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testESOConnection };