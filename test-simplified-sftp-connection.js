/**
 * Test Simplified SFTP Connection
 * 
 * Test the new simplified SFTP configuration against ESO server
 * to verify it resolves the "Connection lost before handshake" errors.
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

const config = {
  host: process.env.SFTP_HOST || 'sftp.esosuite.net',
  port: parseInt(process.env.SFTP_PORT) || 22,
  username: process.env.SFTP_USER || 'CA-EMS',
  password: process.env.SFTP_PASS || 'EventMedicalPCR1!',
  directory: process.env.SFTP_DIR || '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9'
};

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  if (isError) {
    console.error(`${timestamp} [ERROR]: ${message}`);
  } else {
    console.log(`${timestamp} [INFO]: ${message}`);
  }
}

/**
 * Create a test XML file for upload
 */
function createTestXMLFile() {
  const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>TEST_${Date.now()}</IncidentNumber>
  <IncidentOrOnset>2025-06-07T18:59:00.000</IncidentOrOnset>
  <DispatchNotified>2025-06-07T18:59:00.000</DispatchNotified>
  <IncidentAddress1>123 Test Street</IncidentAddress1>
  <IncidentCity>Test City</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>90210</IncidentZip>
  <CadDispatchText>SFTP Connection Test - Simplified Configuration</CadDispatchText>
  <EmsUnitCallSign>TEST1</EmsUnitCallSign>
  <UnitNotifiedByDispatch>2025-06-07T18:59:00.000</UnitNotifiedByDispatch>
  <ResponseModeToScene>395</ResponseModeToScene>
  <CallNature>540</CallNature>
  <PrimaryImpressionDescription>Connection Test</PrimaryImpressionDescription>
</CadIncident>`;

  const filename = `test_simplified_connection_${Date.now()}.xml`;
  const filepath = path.join('/tmp', filename);
  
  fs.writeFileSync(filepath, testXML);
  log(`Created test XML file: ${filepath}`);
  
  return { filepath, filename };
}

/**
 * Test simplified SFTP connection and upload
 */
async function testSimplifiedConnection() {
  log('Testing simplified SFTP connection configuration...');
  
  const { filepath, filename } = createTestXMLFile();
  const remoteFilePath = `${config.directory}/${filename}`;
  
  const sftp = new SftpClient();
  
  try {
    log(`Connecting to SFTP server: ${config.host}:${config.port}`);
    log(`Using simplified configuration (minimal parameters)`);
    
    // Add 2 second delay as in production
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Use the exact same simplified configuration as production
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 20000,
      timeout: 20000
    });
    
    log('✅ SFTP connection successful with simplified configuration');
    
    // Test directory listing
    log(`Checking remote directory: ${config.directory}`);
    const dirExists = await sftp.exists(config.directory);
    log(`Remote directory exists: ${dirExists}`);
    
    // Test file upload
    log(`Uploading test file to: ${remoteFilePath}`);
    await sftp.put(filepath, remoteFilePath);
    log('✅ File upload successful');
    
    // Verify file was uploaded
    const uploadedFileExists = await sftp.exists(remoteFilePath);
    log(`Uploaded file exists on server: ${uploadedFileExists}`);
    
    if (uploadedFileExists) {
      log('✅ File upload verification successful');
    }
    
    await sftp.end();
    log('✅ SFTP connection closed cleanly');
    
    // Clean up local test file
    fs.unlinkSync(filepath);
    log(`Cleaned up local test file: ${filepath}`);
    
    return true;
    
  } catch (error) {
    log(`SFTP operation failed: ${error.message}`, true);
    log(`Error code: ${error.code || 'Unknown'}`);
    log(`Error level: ${error.level || 'Unknown'}`);
    
    try {
      await sftp.end();
    } catch (endError) {
      log(`Error during connection cleanup: ${endError.message}`, true);
    }
    
    // Clean up local test file
    try {
      fs.unlinkSync(filepath);
    } catch (cleanupError) {
      log(`Error cleaning up test file: ${cleanupError.message}`, true);
    }
    
    return false;
  }
}

/**
 * Test multiple connections to verify stability
 */
async function testConnectionStability() {
  log('\n=== Testing Connection Stability ===');
  log('Performing 5 consecutive connection tests with 30-second intervals...');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 1; i <= 5; i++) {
    log(`\nConnection Test ${i}/5:`);
    
    try {
      const result = await testSimplifiedConnection();
      if (result) {
        successCount++;
        log(`✅ Test ${i} PASSED`);
      } else {
        failureCount++;
        log(`❌ Test ${i} FAILED`);
      }
    } catch (error) {
      failureCount++;
      log(`❌ Test ${i} FAILED: ${error.message}`, true);
    }
    
    // Wait 30 seconds between tests (except for the last test)
    if (i < 5) {
      log('Waiting 30 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
  
  log('\n=== Stability Test Results ===');
  log(`Successful connections: ${successCount}/5`);
  log(`Failed connections: ${failureCount}/5`);
  log(`Success rate: ${(successCount / 5 * 100).toFixed(1)}%`);
  
  if (successCount >= 4) {
    log('✅ Connection stability: EXCELLENT (80%+ success rate)');
  } else if (successCount >= 3) {
    log('⚠️  Connection stability: GOOD (60-79% success rate)');
  } else {
    log('❌ Connection stability: POOR (<60% success rate)');
  }
  
  return successCount >= 3; // Consider 60%+ success rate as acceptable
}

/**
 * Main test function
 */
async function main() {
  log('Starting simplified SFTP connection test...');
  log(`Target: ${config.host}:${config.port}`);
  log(`Directory: ${config.directory}`);
  log(`Username: ${config.username}`);
  
  try {
    // Single connection test
    log('\n=== Single Connection Test ===');
    const singleTestResult = await testSimplifiedConnection();
    
    if (singleTestResult) {
      log('\n✅ Single connection test PASSED');
      
      // If single test passes, run stability test
      const stabilityResult = await testConnectionStability();
      
      if (stabilityResult) {
        log('\n🎉 SIMPLIFIED SFTP CONFIGURATION VERIFIED');
        log('The simplified configuration resolves handshake issues');
        log('Recommended for production use');
      } else {
        log('\n⚠️  Simplified configuration works but has stability issues');
        log('Consider implementing additional retry logic');
      }
    } else {
      log('\n❌ Single connection test FAILED');
      log('Simplified configuration may not resolve the issue');
      log('Further investigation required');
    }
    
  } catch (error) {
    log(`Test script failed: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the test
main();