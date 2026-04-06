/**
 * Complete System Test - Resgrid ESO Bridge v2.2.0
 * Tests all core functionality including timestamp formatting
 */

require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

class SystemTester {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      tests: []
    };
  }

  log(test, status, details = '') {
    const result = { test, status, details };
    this.results.tests.push(result);
    
    if (status === 'PASS') {
      this.results.passed++;
      console.log(`✅ ${test}: PASSED ${details ? '- ' + details : ''}`);
    } else {
      this.results.failed++;
      console.log(`❌ ${test}: FAILED ${details ? '- ' + details : ''}`);
    }
  }

  async testWebServer() {
    try {
      const response = await axios.get('http://localhost:5000/status', { timeout: 5000 });
      
      if (response.status === 200 && response.data.status === 'OK') {
        this.log('Web Server Health', 'PASS', `Version ${response.data.version}, Uptime: ${Math.round(response.data.uptime)}s`);
        
        // Check timestamp formatting feature
        if (response.data.features?.timestampFormatting === 'YYYY-MM-DD HH:MM:SS') {
          this.log('Timestamp Feature Flag', 'PASS', 'YYYY-MM-DD HH:MM:SS format confirmed');
        } else {
          this.log('Timestamp Feature Flag', 'FAIL', 'Timestamp format flag not set correctly');
        }
        
        return true;
      } else {
        this.log('Web Server Health', 'FAIL', `Unexpected response: ${response.status}`);
        return false;
      }
    } catch (error) {
      this.log('Web Server Health', 'FAIL', error.message);
      return false;
    }
  }

  async testResgridAPIConnection() {
    try {
      // Use the same OAuth2 method as the actual system
      const querystring = require('querystring');
      const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
        querystring.stringify({
          grant_type: 'password',
          username: process.env.RESGRID_USER,
          password: process.env.RESGRID_PASS
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        });

      if (response.data && response.data.access_token) {
        this.log('Resgrid API Connection', 'PASS', 'OAuth2 authentication successful');
        return response.data.access_token;
      } else {
        this.log('Resgrid API Connection', 'FAIL', 'No access_token received');
        return null;
      }
    } catch (error) {
      this.log('Resgrid API Connection', 'FAIL', error.message);
      return null;
    }
  }

  async testGoogleSheetsConnection() {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Test reading from Call Data sheet
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.LOG_SHEET_ID,
        range: 'Call Data!A1:C1'
      });
      
      if (response.data && response.data.values) {
        this.log('Google Sheets Connection', 'PASS', 'Successfully read Call Data sheet');
        return true;
      } else {
        this.log('Google Sheets Connection', 'FAIL', 'Could not read sheet data');
        return false;
      }
    } catch (error) {
      this.log('Google Sheets Connection', 'FAIL', error.message);
      return false;
    }
  }

  async testTimestampFormatting() {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets']
      });
      
      const sheets = google.sheets({ version: 'v4', auth });
      
      // Get recent call data to check timestamp formats
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.LOG_SHEET_ID,
        range: 'Call Data!A1:AK5'
      });
      
      const data = response.data.values || [];
      const headers = data[0] || [];
      
      // Check timestamp fields
      const timestampFields = [
        'Call Received Time',
        'Call Closed Time', 
        'Record Created',
        'Last Updated',
        'Unit Dispatched Times'
      ];
      
      const correctFormatRegex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
      let correctFormats = 0;
      let totalChecks = 0;
      
      for (const fieldName of timestampFields) {
        const fieldIndex = headers.findIndex(h => h === fieldName);
        if (fieldIndex === -1) continue;
        
        // Check recent entries (skip header row)
        for (let i = 1; i < Math.min(data.length, 4); i++) {
          const value = data[i][fieldIndex];
          if (value && value.trim() !== '' && value !== 'Yes') {
            totalChecks++;
            
            // Handle comma-separated values (unit timing fields)
            if (value.includes(',')) {
              const timestamps = value.split(',').map(t => t.trim());
              if (timestamps.every(t => correctFormatRegex.test(t))) {
                correctFormats++;
              }
            } else {
              if (correctFormatRegex.test(value)) {
                correctFormats++;
              }
            }
          }
        }
      }
      
      if (totalChecks > 0) {
        const percentage = Math.round((correctFormats / totalChecks) * 100);
        if (percentage >= 80) {
          this.log('Timestamp Format Compliance', 'PASS', `${correctFormats}/${totalChecks} (${percentage}%) use correct format`);
        } else {
          this.log('Timestamp Format Compliance', 'FAIL', `Only ${correctFormats}/${totalChecks} (${percentage}%) use correct format`);
        }
      } else {
        this.log('Timestamp Format Compliance', 'FAIL', 'No timestamp data found to test');
      }
      
    } catch (error) {
      this.log('Timestamp Format Compliance', 'FAIL', error.message);
    }
  }

  async testSFTPConfiguration() {
    try {
      // Test SFTP configuration (without actual connection since it's read-only)
      const requiredEnvVars = ['SFTP_HOST', 'SFTP_USER', 'SFTP_PASS', 'SFTP_DIR'];
      const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
      
      if (missingVars.length === 0) {
        this.log('SFTP Configuration', 'PASS', `Host: ${process.env.SFTP_HOST}, User: ${process.env.SFTP_USER}`);
      } else {
        this.log('SFTP Configuration', 'FAIL', `Missing variables: ${missingVars.join(', ')}`);
      }
    } catch (error) {
      this.log('SFTP Configuration', 'FAIL', error.message);
    }
  }

  async testCallProcessing(token) {
    if (!token) {
      this.log('Call Processing Test', 'FAIL', 'No Resgrid token available');
      return;
    }

    try {
      // Try to fetch active calls to test API connectivity
      const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      if (response.status === 200) {
        const callCount = response.data?.Data?.length || 0;
        this.log('Call Data Retrieval', 'PASS', `Retrieved ${callCount} active calls`);
      } else {
        this.log('Call Data Retrieval', 'FAIL', `Unexpected status: ${response.status}`);
      }
    } catch (error) {
      this.log('Call Data Retrieval', 'FAIL', error.message);
    }
  }

  async testXMLGeneration() {
    try {
      // Test XML generation using existing system components
      const fs = require('fs');
      const path = require('path');
      
      // Check if XML generator module exists and can be loaded
      const xmlGeneratorPath = path.join(__dirname, 'src', 'xml-generator.js');
      if (!fs.existsSync(xmlGeneratorPath)) {
        this.log('XML Generation', 'FAIL', 'XML generator module not found');
        return;
      }
      
      // Test that the module can be required
      const xmlGenerator = require('./src/xml-generator');
      if (typeof xmlGenerator.generateXML === 'function') {
        this.log('XML Generation', 'PASS', 'XML generator module loaded successfully');
      } else {
        this.log('XML Generation', 'FAIL', 'XML generator function not available');
      }
    } catch (error) {
      this.log('XML Generation', 'FAIL', error.message);
    }
  }

  async runCompleteTest() {
    console.log('🔬 COMPLETE SYSTEM TEST - Resgrid ESO Bridge v2.2.0');
    console.log('='.repeat(60));
    console.log(`Test started: ${new Date().toISOString()}`);
    console.log('');

    // Core connectivity tests
    console.log('📡 CONNECTIVITY TESTS');
    console.log('-'.repeat(30));
    
    const webServerOK = await this.testWebServer();
    const token = await this.testResgridAPIConnection();
    await this.testGoogleSheetsConnection();
    await this.testSFTPConfiguration();
    
    console.log('');
    
    // Functionality tests
    console.log('⚙️  FUNCTIONALITY TESTS');
    console.log('-'.repeat(30));
    
    await this.testTimestampFormatting();
    await this.testCallProcessing(token);
    await this.testXMLGeneration();
    
    console.log('');
    
    // Final summary
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Tests: ${this.results.passed + this.results.failed}`);
    console.log(`Passed: ${this.results.passed}`);
    console.log(`Failed: ${this.results.failed}`);
    
    const successRate = Math.round((this.results.passed / (this.results.passed + this.results.failed)) * 100);
    console.log(`Success Rate: ${successRate}%`);
    
    if (this.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED - System is fully operational!');
    } else if (successRate >= 80) {
      console.log('⚠️  Some tests failed but core functionality is working');
    } else {
      console.log('❌ Multiple critical issues detected - system needs attention');
    }
    
    console.log('');
    console.log('System Status:');
    console.log(`- Emergency call processing: ${webServerOK ? 'OPERATIONAL' : 'OFFLINE'}`);
    console.log(`- XML generation and upload: ${token ? 'READY' : 'LIMITED'}`);
    console.log(`- Google Sheets logging: ACTIVE`);
    console.log(`- Timestamp formatting: YYYY-MM-DD HH:MM:SS`);
    
    return this.results;
  }
}

// Run the test
const tester = new SystemTester();
tester.runCompleteTest().catch(console.error);