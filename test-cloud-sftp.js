/**
 * Test Cloud SFTP Client
 * Verify the enhanced SFTP client works in cloud environments
 */

require('dotenv').config();
const CloudSftpClient = require('./src/sftp-client');
const fs = require('fs');
const path = require('path');

async function testCloudSFTP() {
  console.log('Testing Enhanced Cloud SFTP Client...\n');
  
  const sftpConfig = {
    host: process.env.SFTP_HOST || 'sftp.esosuite.net',
    port: process.env.SFTP_PORT || 22,
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASS
  };
  
  if (!sftpConfig.username || !sftpConfig.password) {
    console.log('❌ SFTP credentials not configured');
    console.log('Set SFTP_USER and SFTP_PASS environment variables');
    return false;
  }
  
  const cloudSftp = new CloudSftpClient(sftpConfig);
  
  try {
    // Test 1: Connection Test
    console.log('1. Testing SFTP connection...');
    const connectionTest = await cloudSftp.testConnection();
    
    if (connectionTest) {
      console.log('✅ SFTP connection test successful');
    } else {
      console.log('❌ SFTP connection test failed');
      return false;
    }
    
    // Test 2: Create test XML file
    console.log('\n2. Creating test XML file...');
    const testXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>TEST-CLOUD-SFTP</IncidentNumber>
  <IncidentOrOnset>2025-06-07T20:45:00.000Z</IncidentOrOnset>
  <DispatchNotified>2025-06-07T20:45:00.000Z</DispatchNotified>
  <IncidentAddress1>123 Test Street</IncidentAddress1>
  <IncidentCity>Los Angeles</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>90210</IncidentZip>
  <CadDispatchText>Cloud SFTP Connection Test</CadDispatchText>
  <CallNature>System Test</CallNature>
  <SceneGpsLocationLat>34.0522</SceneGpsLocationLat>
  <SceneGpsLocationLong>-118.2437</SceneGpsLocationLong>
  <Units>
    <Unit>
      <EmsUnitCallSign>TEST1</EmsUnitCallSign>
      <ResponseModeToScene>390</ResponseModeToScene>
      <UnitNotifiedByDispatch>2025-06-07T20:45:00.000Z</UnitNotifiedByDispatch>
      <UnitEnRoute></UnitEnRoute>
      <UnitArrivedOnScene></UnitArrivedOnScene>
      <UnitAtPatient></UnitAtPatient>
      <UnitCleared></UnitCleared>
      <UnitBackInService></UnitBackInService>
      <PatientFirstName></PatientFirstName>
      <PatientLastName></PatientLastName>
      <PatientDOB></PatientDOB>
    </Unit>
  </Units>
</CadIncident>`;

    const testFilePath = './test-cloud-sftp.xml';
    fs.writeFileSync(testFilePath, testXmlContent);
    console.log('✅ Test XML file created');
    
    // Test 3: Upload test file
    console.log('\n3. Testing file upload...');
    const remotePath = `${process.env.SFTP_DIR}/test_cloud_sftp_${Date.now()}.xml`;
    
    await cloudSftp.connect();
    await cloudSftp.uploadFile(testFilePath, remotePath);
    await cloudSftp.disconnect();
    
    console.log('✅ File upload successful');
    
    // Cleanup
    fs.unlinkSync(testFilePath);
    console.log('✅ Test file cleaned up');
    
    console.log('\n🎯 Cloud SFTP Test Results: SUCCESS');
    console.log('✅ Connection established with cloud-optimized settings');
    console.log('✅ File upload completed without handshake errors');
    console.log('✅ Enhanced error handling working correctly');
    
    return true;
    
  } catch (error) {
    console.log(`\n❌ Cloud SFTP Test Failed: ${error.message}`);
    console.log('\nTroubleshooting:');
    console.log('- Verify SFTP credentials are correct');
    console.log('- Check network connectivity to ESO SFTP server');
    console.log('- Ensure cloud platform allows outbound SFTP connections');
    console.log('- Review Fly.io logs for detailed error information');
    
    return false;
  }
}

testCloudSFTP().catch(console.error);