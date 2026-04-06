/**
 * Comprehensive system test - verify all components work correctly
 * Tests API connectivity, XML generation, Google Sheets integration, and all core functions
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');

class SystemTester {
  constructor() {
    this.results = {
      apiAuth: false,
      googleAuth: false,
      xmlGeneration: false,
      sheetsWrite: false,
      resgridApi: false,
      errors: []
    };
  }

  log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const level = isError ? 'ERROR' : 'INFO';
    console.log(`[${timestamp}] ${level}: ${message}`);
    if (isError) {
      this.results.errors.push(message);
    }
  }

  async testResgridAuth() {
    this.log('Testing Resgrid API authentication...');
    try {
      const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
        grant_type: 'password',
        username: process.env.RESGRID_USER,
        password: process.env.RESGRID_PASS
      }, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      if (response.data.access_token) {
        this.results.apiAuth = true;
        this.log('Resgrid API authentication: SUCCESS');
        return response.data.access_token;
      } else {
        throw new Error('No access token received');
      }
    } catch (error) {
      this.log(`Resgrid API authentication failed: ${error.message}`, true);
      return null;
    }
  }

  async testGoogleAuth() {
    this.log('Testing Google Sheets authentication...');
    try {
      let serviceAccount;
      
      if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      } else if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
        const decodedJson = Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf-8');
        serviceAccount = JSON.parse(decodedJson);
      } else {
        throw new Error('No Google service account credentials found');
      }

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });

      const authClient = await auth.getClient();
      this.results.googleAuth = true;
      this.log('Google Sheets authentication: SUCCESS');
      return auth;
    } catch (error) {
      this.log(`Google Sheets authentication failed: ${error.message}`, true);
      return null;
    }
  }

  async testResgridAPI(token) {
    this.log('Testing Resgrid API endpoints...');
    if (!token) {
      this.log('Cannot test API endpoints without valid token', true);
      return false;
    }

    const endpoints = [
      { url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls', name: 'GetActiveCalls' },
      { url: 'https://api.resgrid.com/api/v4/Calls/GetCall?callId=198898', name: 'GetCall' },
      { url: 'https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=198898', name: 'GetCallExtraData' }
    ];

    let successCount = 0;
    for (const endpoint of endpoints) {
      try {
        const response = await axios.get(endpoint.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.status === 200) {
          this.log(`${endpoint.name}: SUCCESS`);
          successCount++;
        } else {
          this.log(`${endpoint.name}: Unexpected status ${response.status}`, true);
        }
      } catch (error) {
        this.log(`${endpoint.name} failed: ${error.message}`, true);
      }
    }

    this.results.resgridApi = successCount === endpoints.length;
    return this.results.resgridApi;
  }

  testXMLGeneration() {
    this.log('Testing XML generation with multiple scenarios...');
    
    try {
      // Test single unit
      const singleUnitCall = {
        CallId: "TEST-001",
        LoggedOn: "2025-06-03T09:30:00.000Z",
        Name: "Medical Emergency",
        Nature: "Patient experiencing symptoms",
        Note: "Single unit test",
        Address: "123 Test St, Test City, CA 90210, USA",
        Type: "Medical",
        Priority: { Id: 1560 },
        Latitude: "34.0522",
        Longitude: "-118.2437"
      };

      const singleUnitExtra = {
        Data: { Dispatches: [{ Type: "Unit", Name: "AMB1" }] }
      };

      const singleXml = generateXML(singleUnitCall, singleUnitExtra);
      
      // Verify single unit structure
      const singleHasEmsUnit = singleXml.includes('<EmsUnitCallSign>');
      const singleHasUnitsWrapper = singleXml.includes('<Units>');
      const singleHasCallNature = singleXml.includes('<CallNature>');
      const singleHasCallNatureDesc = singleXml.includes('<CallNatureDescription>');

      if (!singleHasEmsUnit || singleHasUnitsWrapper || !singleHasCallNature || singleHasCallNatureDesc) {
        throw new Error('Single unit XML structure validation failed');
      }

      // Test multiple units
      const multiUnitCall = {
        CallId: "TEST-002",
        LoggedOn: "2025-06-03T09:30:00.000Z",
        Name: "Structure Fire",
        Nature: "House fire with entrapment",
        Note: "Multiple unit response",
        Address: "456 Fire Ave, Emergency City, CA 90210, USA",
        Type: "Fire",
        Priority: { Id: 1560 },
        Latitude: "34.0522",
        Longitude: "-118.2437"
      };

      const multiUnitExtra = {
        Data: {
          Dispatches: [
            { Type: "Unit", Name: "ENGINE1" },
            { Type: "Unit", Name: "LADDER1" },
            { Type: "Unit", Name: "RESCUE1" }
          ]
        }
      };

      const multiXml = generateXML(multiUnitCall, multiUnitExtra);
      
      // Verify multiple unit structure
      const multiHasUnitsWrapper = multiXml.includes('<Units>');
      const multiUnitCount = (multiXml.match(/<Unit>/g) || []).length;
      const multiHasCallNature = multiXml.includes('<CallNature>');
      const multiHasCallNatureDesc = multiXml.includes('<CallNatureDescription>');

      if (!multiHasUnitsWrapper || multiUnitCount !== 3 || !multiHasCallNature || multiHasCallNatureDesc) {
        throw new Error('Multiple unit XML structure validation failed');
      }

      // Save test XMLs
      fs.mkdirSync('test-output', { recursive: true });
      fs.writeFileSync('test-output/system-test-single.xml', singleXml);
      fs.writeFileSync('test-output/system-test-multi.xml', multiXml);

      this.results.xmlGeneration = true;
      this.log('XML generation: SUCCESS (both single and multiple unit formats validated)');
      return true;

    } catch (error) {
      this.log(`XML generation failed: ${error.message}`, true);
      return false;
    }
  }

  async testSheetsWrite(auth) {
    this.log('Testing Google Sheets write operations...');
    if (!auth) {
      this.log('Cannot test Sheets write without valid auth', true);
      return false;
    }

    try {
      const sheets = google.sheets({ version: 'v4', auth });
      const spreadsheetId = process.env.LOG_SHEET_ID;

      if (!spreadsheetId) {
        throw new Error('LOG_SHEET_ID not configured');
      }

      // Test write to Logs sheet
      const testLogEntry = [
        [
          new Date().toISOString(),
          'info',
          'System test - Google Sheets write operation verification',
          'SYSTEM_TEST',
          'All components functioning correctly'
        ]
      ];

      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: 'Logs!A:E',
        valueInputOption: 'RAW',
        resource: { values: testLogEntry }
      });

      this.results.sheetsWrite = true;
      this.log('Google Sheets write: SUCCESS');
      return true;

    } catch (error) {
      this.log(`Google Sheets write failed: ${error.message}`, true);
      return false;
    }
  }

  async testEnvironmentVariables() {
    this.log('Testing environment variables...');
    
    const requiredVars = [
      'RESGRID_USER',
      'RESGRID_PASS', 
      'LOG_SHEET_ID',
      'SFTP_HOST',
      'SFTP_USER',
      'SFTP_DIR'
    ];

    const missingVars = [];
    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    // Check for Google credentials
    if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON && !process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64) {
      missingVars.push('GOOGLE_SERVICE_ACCOUNT_JSON or GOOGLE_SERVICE_ACCOUNT_JSON_BASE64');
    }

    if (missingVars.length > 0) {
      this.log(`Missing environment variables: ${missingVars.join(', ')}`, true);
      return false;
    }

    this.log('Environment variables: SUCCESS');
    return true;
  }

  async testCoreFiles() {
    this.log('Testing core application files...');
    
    const requiredFiles = [
      'src/xml-generator.js',
      'src/sheets-logger.js',
      'listener.js',
      'package.json'
    ];

    for (const file of requiredFiles) {
      if (!fs.existsSync(file)) {
        this.log(`Missing required file: ${file}`, true);
        return false;
      }
    }

    // Test if core modules load without errors
    try {
      require('./src/xml-generator.js');
      require('./src/sheets-logger.js');
      this.log('Core files: SUCCESS');
      return true;
    } catch (error) {
      this.log(`Core file loading failed: ${error.message}`, true);
      return false;
    }
  }

  generateReport() {
    this.log('\n=== COMPREHENSIVE SYSTEM TEST REPORT ===');
    this.log('=========================================');
    
    const tests = [
      { name: 'Environment Variables', passed: this.results.errors.filter(e => e.includes('environment')).length === 0 },
      { name: 'Core Files', passed: this.results.errors.filter(e => e.includes('file')).length === 0 },
      { name: 'Resgrid Authentication', passed: this.results.apiAuth },
      { name: 'Google Sheets Authentication', passed: this.results.googleAuth },
      { name: 'Resgrid API Endpoints', passed: this.results.resgridApi },
      { name: 'XML Generation', passed: this.results.xmlGeneration },
      { name: 'Google Sheets Write', passed: this.results.sheetsWrite }
    ];

    tests.forEach(test => {
      const status = test.passed ? 'PASS' : 'FAIL';
      this.log(`${test.name}: ${status}`);
    });

    const totalPassed = tests.filter(t => t.passed).length;
    const totalTests = tests.length;
    
    this.log(`\nOverall Results: ${totalPassed}/${totalTests} tests passed`);
    
    if (this.results.errors.length > 0) {
      this.log('\nErrors encountered:');
      this.results.errors.forEach((error, index) => {
        this.log(`${index + 1}. ${error}`);
      });
    }

    const allPassed = totalPassed === totalTests;
    this.log(`\nSystem Status: ${allPassed ? 'HEALTHY' : 'ISSUES DETECTED'}`);
    
    if (allPassed) {
      this.log('All systems operational - ready for production use');
    } else {
      this.log('System requires attention before production use');
    }

    return allPassed;
  }

  async runAllTests() {
    this.log('Starting comprehensive system test...');
    
    // Test environment and files first
    await this.testEnvironmentVariables();
    await this.testCoreFiles();
    
    // Test authentication
    const token = await this.testResgridAuth();
    const googleAuth = await this.testGoogleAuth();
    
    // Test API functionality
    await this.testResgridAPI(token);
    
    // Test XML generation
    this.testXMLGeneration();
    
    // Test Sheets integration
    await this.testSheetsWrite(googleAuth);
    
    // Generate final report
    return this.generateReport();
  }
}

// Run the comprehensive test
async function main() {
  const tester = new SystemTester();
  await tester.runAllTests();
}

main().catch(error => {
  console.error('System test failed:', error.message);
  process.exit(1);
});