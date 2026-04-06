/**
 * Test Live Handshake Fix
 * Force process an active call to verify SFTP handshake resolution
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator');
const FlyIoSftpClient = require('./src/fly-io-sftp-client');
const { config } = require('./src/config');
const fs = require('fs');
const path = require('path');

async function testLiveHandshakeFix() {
  console.log('Testing Live Handshake Fix with Active Call...\n');
  
  // Create test call data based on the failing call
  const testCallData = {
    CallId: 'HANDSHAKE-TEST-' + Date.now(),
    Timestamp: new Date().toISOString(),
    Name: 'Handshake Fix Verification',
    Nature: 'System Test',
    Address: '123 Test Street',
    UnitsCsv: 'TEST1',
    Notes: 'Testing Fly.io SFTP handshake fix',
    IncidentAddress1: '123 Test Street',
    City: 'Los Angeles',
    State: 'CA',
    Zip: '90210',
    Priority: 'High',
    ResponseModeToScene: '390'
  };
  
  const testExtraData = {
    Data: {
      Dispatches: [{
        Type: 'Unit',
        Name: 'TEST1'
      }],
      Activity: []
    }
  };
  
  console.log('1. Generating test XML...');
  const xmlResult = await generateXML(testCallData, testExtraData);
  const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
  
  console.log('2. Testing Fly.io SFTP connection...');
  const sftpConfig = {
    host: config.sftp.host,
    port: config.sftp.port,
    username: config.sftp.username,
    password: config.sftp.password
  };
  
  const flyClient = new FlyIoSftpClient(sftpConfig);
  
  try {
    // Create temporary file
    const timestamp = Date.now();
    const filename = `handshake_test_${timestamp}.xml`;
    const localPath = path.join('./temp', filename);
    const remotePath = `${config.sftp.remotePath}/${filename}`;
    
    // Ensure temp directory exists
    if (!fs.existsSync('./temp')) {
      fs.mkdirSync('./temp', { recursive: true });
    }
    
    // Write XML to file
    fs.writeFileSync(localPath, xmlData);
    
    console.log('3. Attempting SFTP upload with Fly.io client...');
    await flyClient.connect();
    await flyClient.uploadFile(localPath, remotePath);
    await flyClient.disconnect();
    
    console.log('4. Cleaning up test file...');
    fs.unlinkSync(localPath);
    
    console.log('\n✅ HANDSHAKE FIX VERIFIED');
    console.log('- Fly.io SFTP client successfully connected');
    console.log('- No handshake connection lost errors');
    console.log('- XML file uploaded without authentication failures');
    console.log('- System ready for production deployment');
    
    return true;
    
  } catch (error) {
    console.log('\n❌ HANDSHAKE FIX FAILED');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('handshake')) {
      console.log('\nHandshake Error Still Present:');
      console.log('- Ultra-conservative connection settings may need adjustment');
      console.log('- Additional algorithm compatibility required');
      console.log('- Raw socket implementation may be necessary');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\nAuthentication Error:');
      console.log('- Verify SFTP credentials in Fly.io secrets');
      console.log('- Check ESO account status and permissions');
    }
    
    return false;
  }
}

testLiveHandshakeFix().catch(console.error);