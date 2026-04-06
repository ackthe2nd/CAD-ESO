/**
 * Complete System Status Check
 * Verifies all components of the Resgrid-ESO Bridge system
 */

require('dotenv').config();

async function performSystemCheck() {
  console.log('='.repeat(60));
  console.log('RESGRID-ESO BRIDGE SYSTEM STATUS CHECK');
  console.log('='.repeat(60));
  
  const results = {
    authentication: false,
    googleSheets: false,
    sftpConnection: false,
    xmlGeneration: false,
    dataProcessing: false,
    uploadStatus: false
  };

  // 1. Test Resgrid Authentication
  console.log('\n1. Testing Resgrid Authentication...');
  try {
    const { getApiToken } = require('./src/token-manager');
    const token = await getApiToken();
    console.log('✅ Resgrid authentication successful');
    results.authentication = true;
  } catch (error) {
    console.log('❌ Resgrid authentication failed:', error.message);
  }

  // 2. Test Google Sheets Connection
  console.log('\n2. Testing Google Sheets Connection...');
  try {
    const { initialize } = require('./src/sheets-logger');
    const sheetsInitialized = await initialize();
    if (sheetsInitialized) {
      console.log('✅ Google Sheets connection successful');
      results.googleSheets = true;
    } else {
      console.log('❌ Google Sheets connection failed');
    }
  } catch (error) {
    console.log('❌ Google Sheets connection error:', error.message);
  }

  // 3. Test SFTP Connection
  console.log('\n3. Testing SFTP Connection...');
  try {
    const Client = require('ssh2-sftp-client');
    const sftp = new Client();
    
    await sftp.connect({
      host: process.env.SFTP_HOST || 'sftp.esosuite.net',
      port: 22,
      username: process.env.SFTP_USER || 'CA-EMS',
      password: process.env.SFTP_PASS,
      algorithms: {
        kex: ['ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group14-sha256'],
        cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
        serverHostKey: ['rsa-sha2-512', 'rsa-sha2-256', 'ssh-rsa'],
        hmac: ['hmac-sha2-256', 'hmac-sha2-512']
      }
    });
    
    await sftp.end();
    console.log('✅ SFTP connection successful');
    results.sftpConnection = true;
  } catch (error) {
    console.log('❌ SFTP connection error:', error.message);
  }

  // 4. Test XML Generation
  console.log('\n4. Testing XML Generation...');
  try {
    const { generateXML } = require('./src/xml-generator');
    
    const testCallData = {
      CallId: 'TEST001',
      Name: 'System Test Call',
      Address: '123 Test St, Test City, CA 12345',
      Geolocation: '34.0522, -118.2437',
      LoggedOn: new Date().toISOString(),
      Priority: 1560,
      State: 1
    };

    const testExtraData = {
      Data: {
        Dispatches: [{
          Type: 'Unit',
          Name: 'TEST1',
          Location: 'Test Station'
        }],
        Activity: []
      }
    };

    const xml = generateXML(testCallData, testExtraData);
    const xmlString = xml?.toString() || '';
    if (xml && xmlString.includes('<EMSDataSet>')) {
      console.log('✅ XML generation successful');
      results.xmlGeneration = true;
    } else {
      console.log('❌ XML generation failed - invalid format');
      console.log('XML type:', typeof xml);
    }
  } catch (error) {
    console.log('❌ XML generation error:', error.message);
  }

  // 5. Test Data Processing
  console.log('\n5. Testing Data Processing...');
  try {
    const axios = require('axios');
    const { getApiToken } = require('./src/token-manager');
    
    const token = await getApiToken();
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.status === 200) {
      console.log('✅ Data processing successful');
      console.log(`   Found ${response.data.Data?.length || 0} active calls`);
      results.dataProcessing = true;
    }
  } catch (error) {
    console.log('❌ Data processing error:', error.message);
  }

  // 6. Test Upload Status Tracking
  console.log('\n6. Testing Upload Status Tracking...');
  try {
    const { google } = require('googleapis');
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
    const credentials = JSON.parse(serviceAccountJson);
    
    const auth = new google.auth.GoogleAuth({
      credentials: credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const sheetsClient = google.sheets({ version: 'v4', auth });
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: process.env.LOG_SHEET_ID,
      range: 'Call Data!1:1'
    });
    
    const headers = response.data.values[0];
    const hasUploadStatus = headers.includes('ESO Upload Status');
    
    if (hasUploadStatus) {
      console.log('✅ Upload status tracking configured');
      results.uploadStatus = true;
    } else {
      console.log('❌ Upload status column not found');
    }
  } catch (error) {
    console.log('❌ Upload status tracking error:', error.message);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SYSTEM STATUS SUMMARY');
  console.log('='.repeat(60));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  
  Object.entries(results).forEach(([component, status]) => {
    const emoji = status ? '✅' : '❌';
    const statusText = status ? 'PASS' : 'FAIL';
    console.log(`${emoji} ${component.charAt(0).toUpperCase() + component.slice(1)}: ${statusText}`);
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Overall System Health: ${passedTests}/${totalTests} components working`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️  SYSTEM MOSTLY OPERATIONAL - Minor issues detected');
  } else {
    console.log('🚨 SYSTEM ISSUES DETECTED - Requires attention');
  }
  
  console.log('='.repeat(60));
  
  return results;
}

if (require.main === module) {
  performSystemCheck().catch(console.error);
}

module.exports = { performSystemCheck };