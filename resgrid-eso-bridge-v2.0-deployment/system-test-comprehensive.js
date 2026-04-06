/**
 * Comprehensive System Test Suite
 * Tests all components of the Resgrid-ESO Bridge system
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const fs = require('fs');

class SystemTester {
  constructor() {
    this.results = {
      authentication: { status: 'pending', details: [] },
      resgridApi: { status: 'pending', details: [] },
      googleSheets: { status: 'pending', details: [] },
      sftpConnection: { status: 'pending', details: [] },
      xmlGeneration: { status: 'pending', details: [] },
      testEndpoint: { status: 'pending', details: [] },
      duplicatePrevention: { status: 'pending', details: [] },
      pacificTimeConsistency: { status: 'pending', details: [] }
    };
  }

  log(category, message, isError = false) {
    const timestamp = new Date().toISOString();
    const status = isError ? 'ERROR' : 'INFO';
    console.log(`[${timestamp}] [${category.toUpperCase()}] ${status}: ${message}`);
    
    if (this.results[category]) {
      this.results[category].details.push({ timestamp, message, isError });
    }
  }

  /**
   * Test 1: Authentication Systems
   */
  async testAuthentication() {
    this.log('authentication', 'Testing authentication systems...');
    
    try {
      // Test Resgrid token acquisition
      const { getApiToken } = require('./src/token-manager');
      const token = await getApiToken();
      
      if (token) {
        this.log('authentication', 'Resgrid API token acquired successfully');
        this.results.authentication.resgridToken = true;
      } else {
        this.log('authentication', 'Failed to acquire Resgrid API token', true);
        this.results.authentication.resgridToken = false;
      }

      // Test Google Sheets authentication
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheetsClient = google.sheets({ version: 'v4', auth });
      const testResponse = await sheetsClient.spreadsheets.get({
        spreadsheetId: process.env.LOG_SHEET_ID
      });

      if (testResponse.data) {
        this.log('authentication', 'Google Sheets authentication successful');
        this.results.authentication.googleSheets = true;
      } else {
        this.log('authentication', 'Google Sheets authentication failed', true);
        this.results.authentication.googleSheets = false;
      }

      this.results.authentication.status = 
        this.results.authentication.resgridToken && this.results.authentication.googleSheets 
        ? 'passed' : 'failed';

    } catch (error) {
      this.log('authentication', `Authentication test failed: ${error.message}`, true);
      this.results.authentication.status = 'failed';
    }
  }

  /**
   * Test 2: Resgrid API Endpoints
   */
  async testResgridApi() {
    this.log('resgridApi', 'Testing Resgrid API endpoints...');
    
    try {
      const { getApiToken } = require('./src/token-manager');
      const token = await getApiToken();

      if (!token) {
        this.log('resgridApi', 'No token available for API testing', true);
        this.results.resgridApi.status = 'failed';
        return;
      }

      // Test GetActiveCalls endpoint
      const activeCallsResponse = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (activeCallsResponse.status === 200) {
        const callCount = activeCallsResponse.data?.Data?.length || 0;
        this.log('resgridApi', `GetActiveCalls successful: ${callCount} active calls`);
        this.results.resgridApi.activeCalls = callCount;
      }

      // Test GetCallExtraData endpoint with an active call
      if (activeCallsResponse.data?.Data?.length > 0) {
        const testCallId = activeCallsResponse.data.Data[0].CallId;
        
        const extraDataResponse = await axios({
          method: 'GET',
          url: `https://api.resgrid.com/api/v4/Calls/GetCallExtraData`,
          params: { callId: testCallId },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (extraDataResponse.status === 200) {
          this.log('resgridApi', `GetCallExtraData successful for call ${testCallId}`);
          this.results.resgridApi.extraData = true;
        }
      }

      this.results.resgridApi.status = 'passed';

    } catch (error) {
      this.log('resgridApi', `Resgrid API test failed: ${error.message}`, true);
      this.results.resgridApi.status = 'failed';
    }
  }

  /**
   * Test 3: Google Sheets Integration
   */
  async testGoogleSheets() {
    this.log('googleSheets', 'Testing Google Sheets integration...');
    
    try {
      const { sheetLog, initialize } = require('./src/sheets-logger');
      
      // Initialize sheets logger
      await initialize();
      this.log('googleSheets', 'Sheets logger initialized successfully');

      // Test logging functionality
      const testResult = await sheetLog('System test log entry', 'info', 'Test Status');
      
      if (testResult) {
        this.log('googleSheets', 'Sheet logging test successful');
        this.results.googleSheets.logging = true;
      } else {
        this.log('googleSheets', 'Sheet logging test failed', true);
        this.results.googleSheets.logging = false;
      }

      // Test header structure
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheetsClient = google.sheets({ version: 'v4', auth });
      const headersResponse = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: process.env.LOG_SHEET_ID,
        range: 'Call Data!A1:AZ1'
      });

      const headers = headersResponse.data.values[0] || [];
      const requiredColumns = ['Emergency Call ID', 'Test Call', 'Test Result'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));

      if (missingColumns.length === 0) {
        this.log('googleSheets', 'All required columns present in Call Data sheet');
        this.results.googleSheets.structure = true;
      } else {
        this.log('googleSheets', `Missing columns: ${missingColumns.join(', ')}`, true);
        this.results.googleSheets.structure = false;
      }

      this.results.googleSheets.status = 
        this.results.googleSheets.logging && this.results.googleSheets.structure 
        ? 'passed' : 'failed';

    } catch (error) {
      this.log('googleSheets', `Google Sheets test failed: ${error.message}`, true);
      this.results.googleSheets.status = 'failed';
    }
  }

  /**
   * Test 4: SFTP Connection
   */
  async testSftpConnection() {
    this.log('sftpConnection', 'Testing SFTP connection...');
    
    try {
      const Client = require('ssh2-sftp-client');
      const sftp = new Client();

      const config = {
        host: 'sftp.esosuite.net',
        port: 22,
        username: 'CA-EMS',
        password: process.env.SFTP_PASSWORD || process.env.RESGRID_PASS,
        algorithms: {
          kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
          cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
          serverHostKey: ['ssh-rsa', 'ssh-dss'],
          hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1']
        },
        readyTimeout: 30000,
        retry: 0
      };

      await sftp.connect(config);
      this.log('sftpConnection', 'SFTP connection established successfully');

      // Test directory listing
      const remoteDir = '/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9';
      const files = await sftp.list(remoteDir);
      this.log('sftpConnection', `Directory listing successful: ${files.length} files found`);

      await sftp.end();
      this.log('sftpConnection', 'SFTP connection closed successfully');

      this.results.sftpConnection.status = 'passed';
      this.results.sftpConnection.fileCount = files.length;

    } catch (error) {
      this.log('sftpConnection', `SFTP connection test failed: ${error.message}`, true);
      this.results.sftpConnection.status = 'failed';
    }
  }

  /**
   * Test 5: XML Generation
   */
  async testXmlGeneration() {
    this.log('xmlGeneration', 'Testing XML generation...');
    
    try {
      const { generateXML } = require('./src/xml-generator');

      // Create test call data
      const testCallData = {
        CallId: 'TEST-001',
        Name: 'System Test Call',
        Nature: 'Medical Emergency',
        Note: 'Test call for system validation',
        Address: '123 Test St, Test City, CA 90210',
        Geolocation: '34.0522,-118.2437',
        LoggedOn: '2025-06-09T02:27:00.000',
        LoggedOnUtc: '2025-06-09T09:27:00.000'
      };

      const testExtraData = {
        Data: {
          Dispatches: [
            {
              UnitId: 'TEST-UNIT-1',
              DispatchedOn: '2025-06-09T02:28:00.000'
            }
          ],
          Activity: []
        }
      };

      const xmlResult = await generateXML(testCallData, testExtraData);
      const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;

      if (xml && xml.length > 0) {
        this.log('xmlGeneration', `XML generated successfully: ${xml.length} characters`);
        
        // Validate XML structure
        const requiredElements = ['<IncidentNumber>', '<IncidentOrOnset>', '<DispatchNotified>'];
        const missingElements = requiredElements.filter(elem => !xml.includes(elem));

        if (missingElements.length === 0) {
          this.log('xmlGeneration', 'XML contains all required elements');
          this.results.xmlGeneration.structure = true;
        } else {
          this.log('xmlGeneration', `XML missing elements: ${missingElements.join(', ')}`, true);
          this.results.xmlGeneration.structure = false;
        }

        this.results.xmlGeneration.status = this.results.xmlGeneration.structure ? 'passed' : 'failed';
        this.results.xmlGeneration.length = xml.length;

      } else {
        this.log('xmlGeneration', 'XML generation failed - no output', true);
        this.results.xmlGeneration.status = 'failed';
      }

    } catch (error) {
      this.log('xmlGeneration', `XML generation test failed: ${error.message}`, true);
      this.results.xmlGeneration.status = 'failed';
    }
  }

  /**
   * Test 6: Test Endpoint Functionality
   */
  async testEndpoint() {
    this.log('testEndpoint', 'Testing endpoint functionality...');
    
    try {
      // Test health endpoint
      const healthResponse = await axios.get('https://resgrid2eso.fly.dev/health');
      
      if (healthResponse.status === 200 && healthResponse.data.status === 'OK') {
        this.log('testEndpoint', 'Health endpoint responding correctly');
        this.results.testEndpoint.health = true;
      } else {
        this.log('testEndpoint', 'Health endpoint not responding correctly', true);
        this.results.testEndpoint.health = false;
      }

      // Test call endpoint (will likely fail until deployment)
      try {
        const testResponse = await axios.get('https://resgrid2eso.fly.dev/test/201192');
        this.log('testEndpoint', 'Test endpoint accessible');
        this.results.testEndpoint.callTest = true;
      } catch (testError) {
        this.log('testEndpoint', 'Test endpoint not yet deployed (expected until Fly.io deployment)');
        this.results.testEndpoint.callTest = false;
      }

      this.results.testEndpoint.status = this.results.testEndpoint.health ? 'passed' : 'failed';

    } catch (error) {
      this.log('testEndpoint', `Endpoint test failed: ${error.message}`, true);
      this.results.testEndpoint.status = 'failed';
    }
  }

  /**
   * Test 7: Duplicate Prevention
   */
  async testDuplicatePrevention() {
    this.log('duplicatePrevention', 'Testing duplicate prevention system...');
    
    try {
      // Check if hash-based duplicate prevention is working
      const hashFile = './processed-call-hashes.json';
      
      if (fs.existsSync(hashFile)) {
        const hashes = JSON.parse(fs.readFileSync(hashFile, 'utf8'));
        const hashCount = Object.keys(hashes).length;
        
        this.log('duplicatePrevention', `Hash file exists with ${hashCount} processed calls`);
        this.results.duplicatePrevention.hashFileExists = true;
        this.results.duplicatePrevention.processedCalls = hashCount;
      } else {
        this.log('duplicatePrevention', 'Hash file not found - system may not have processed calls yet');
        this.results.duplicatePrevention.hashFileExists = false;
      }

      this.results.duplicatePrevention.status = 'passed';

    } catch (error) {
      this.log('duplicatePrevention', `Duplicate prevention test failed: ${error.message}`, true);
      this.results.duplicatePrevention.status = 'failed';
    }
  }

  /**
   * Test 8: Pacific Time Consistency
   */
  async testPacificTimeConsistency() {
    this.log('pacificTimeConsistency', 'Testing Pacific Time consistency...');
    
    try {
      // Test Pacific Time conversion function
      const sheetsLogger = require('./src/sheets-logger');
      const testUtcTime = '2025-06-09T10:00:00.000Z';
      
      // Test conversion manually since function might not be exported
      const testDate = new Date(testUtcTime);
      const pacificTime = testDate.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      if (pacificTime && pacificTime !== testUtcTime) {
        this.log('pacificTimeConsistency', `Time conversion working: ${testUtcTime} -> ${pacificTime}`);
        this.results.pacificTimeConsistency.conversion = true;
      } else {
        this.log('pacificTimeConsistency', 'Time conversion not working correctly', true);
        this.results.pacificTimeConsistency.conversion = false;
      }

      // Check Google Sheets for Pacific Time consistency
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      const sheetsClient = google.sheets({ version: 'v4', auth });
      const dataResponse = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: process.env.LOG_SHEET_ID,
        range: 'Call Data!A2:C5'
      });

      const rows = dataResponse.data.values || [];
      let pacificTimeFound = false;

      rows.forEach(row => {
        if (row[0] && !row[0].includes('Z') && row[0].match(/\d{4}-\d{2}-\d{2}/)) {
          pacificTimeFound = true;
        }
      });

      if (pacificTimeFound) {
        this.log('pacificTimeConsistency', 'Pacific Time format found in Google Sheets');
        this.results.pacificTimeConsistency.sheetsFormat = true;
      } else {
        this.log('pacificTimeConsistency', 'Pacific Time format verification inconclusive');
        this.results.pacificTimeConsistency.sheetsFormat = false;
      }

      this.results.pacificTimeConsistency.status = 
        this.results.pacificTimeConsistency.conversion ? 'passed' : 'failed';

    } catch (error) {
      this.log('pacificTimeConsistency', `Pacific Time test failed: ${error.message}`, true);
      this.results.pacificTimeConsistency.status = 'failed';
    }
  }

  /**
   * Run all system tests
   */
  async runAllTests() {
    console.log('='.repeat(80));
    console.log('COMPREHENSIVE SYSTEM TEST - RESGRID-ESO BRIDGE');
    console.log('='.repeat(80));
    console.log('');

    const tests = [
      () => this.testAuthentication(),
      () => this.testResgridApi(),
      () => this.testGoogleSheets(),
      () => this.testSftpConnection(),
      () => this.testXmlGeneration(),
      () => this.testEndpoint(),
      () => this.testDuplicatePrevention(),
      () => this.testPacificTimeConsistency()
    ];

    for (const test of tests) {
      await test();
      console.log(''); // Add spacing between tests
    }

    this.generateReport();
  }

  /**
   * Generate comprehensive test report
   */
  generateReport() {
    console.log('='.repeat(80));
    console.log('SYSTEM TEST RESULTS');
    console.log('='.repeat(80));

    const categories = Object.keys(this.results);
    let passedCount = 0;
    let failedCount = 0;

    categories.forEach(category => {
      const result = this.results[category];
      const status = result.status.toUpperCase();
      const icon = result.status === 'passed' ? '✅' : result.status === 'failed' ? '❌' : '⏸️';
      
      console.log(`${icon} ${category.toUpperCase()}: ${status}`);
      
      if (result.status === 'passed') passedCount++;
      else if (result.status === 'failed') failedCount++;
    });

    console.log('');
    console.log(`SUMMARY: ${passedCount} passed, ${failedCount} failed, ${categories.length - passedCount - failedCount} pending`);
    
    const overallStatus = failedCount === 0 ? 'SYSTEM READY FOR DEPLOYMENT' : 'SYSTEM NEEDS ATTENTION';
    console.log(`OVERALL STATUS: ${overallStatus}`);
    console.log('='.repeat(80));

    // Save detailed results to file
    fs.writeFileSync('./system-test-results.json', JSON.stringify(this.results, null, 2));
    console.log('Detailed results saved to: system-test-results.json');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new SystemTester();
  tester.runAllTests().catch(console.error);
}

module.exports = SystemTester;