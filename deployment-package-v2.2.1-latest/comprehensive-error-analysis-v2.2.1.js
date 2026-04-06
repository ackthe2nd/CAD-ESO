/**
 * Comprehensive Error Analysis - Version 2.2.1
 * Systematic testing with detailed error reporting and analysis
 */
require('dotenv').config();
const axios = require('axios');
const { google } = require('googleapis');

const BASE_URL = 'http://localhost:5000';

class ComprehensiveErrorAnalysis {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      errors: [],
      warnings: [],
      performance: {},
      systemHealth: {}
    };
  }

  log(message, type = 'INFO') {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false
    });
    console.log(`[${timestamp}] ${type}: ${message}`);
  }

  recordError(test, error, severity = 'ERROR') {
    this.results.errors.push({
      test,
      error: error.message,
      stack: error.stack,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  recordWarning(test, warning) {
    this.results.warnings.push({
      test,
      warning,
      timestamp: new Date().toISOString()
    });
  }

  async test(name, testFn, critical = false) {
    this.results.total++;
    this.log(`Testing ${name}...`, 'TEST');
    const startTime = Date.now();
    
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      this.results.passed++;
      this.results.performance[name] = duration;
      this.log(`✅ ${name} PASSED (${duration}ms)`, 'PASS');
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.results.failed++;
      this.results.performance[name] = duration;
      
      const severity = critical ? 'CRITICAL' : 'ERROR';
      this.recordError(name, error, severity);
      this.log(`❌ ${name} FAILED: ${error.message} (${duration}ms)`, 'FAIL');
      return null;
    }
  }

  async runComprehensiveErrorAnalysis() {
    console.log('=== COMPREHENSIVE ERROR ANALYSIS v2.2.1 ===');
    console.log('Systematic testing with detailed error documentation...\n');

    // Test 1: System Status - Critical
    await this.test('System Status Endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/status`, { timeout: 5000 });
      
      if (response.status !== 200) {
        throw new Error(`HTTP Status ${response.status}: Expected 200`);
      }
      
      const data = response.data;
      
      // Validate response structure
      if (!data.status) throw new Error('Missing status field');
      if (!data.version) throw new Error('Missing version field');
      if (!data.features) throw new Error('Missing features field');
      
      if (data.status !== 'OK') {
        throw new Error(`System status is '${data.status}', expected 'OK'`);
      }
      
      if (data.version !== '2.2.1') {
        this.recordWarning('System Status', `Version mismatch: got ${data.version}, expected 2.2.1`);
      }
      
      // Check required features
      const requiredFeatures = [
        'timestampFormatting',
        'callClosureDetection', 
        'duplicatePrevention',
        'xmlUpload',
        'googleSheetsLogging'
      ];
      
      for (const feature of requiredFeatures) {
        if (!data.features[feature]) {
          throw new Error(`Missing feature: ${feature}`);
        }
        if (data.features[feature] !== 'enabled') {
          throw new Error(`Feature ${feature} is '${data.features[feature]}', expected 'enabled'`);
        }
      }
      
      this.results.systemHealth.status = data.status;
      this.results.systemHealth.uptime = data.uptime;
      this.results.systemHealth.memory = data.memory;
      
      return data;
    }, true);

    // Test 2: XML Integrity Monitoring
    await this.test('XML Integrity Monitoring', async () => {
      const response = await axios.get(`${BASE_URL}/integrity`, { timeout: 5000 });
      
      if (response.status !== 200) {
        throw new Error(`HTTP Status ${response.status}: Expected 200`);
      }
      
      const data = response.data;
      
      if (!data.hasOwnProperty('success')) {
        throw new Error('Missing success field in integrity response');
      }
      
      if (!data.integrity) {
        throw new Error('Missing integrity data');
      }
      
      if (!data.timestamp) {
        throw new Error('Missing timestamp in integrity response');
      }
      
      return data;
    });

    // Test 3: Google Sheets Connection - Critical
    await this.test('Google Sheets Connection', async () => {
      const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (!serviceAccountJson) {
        throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON environment variable not found');
      }
      
      let credentials;
      try {
        credentials = JSON.parse(serviceAccountJson);
      } catch (parseError) {
        throw new Error(`Invalid JSON in GOOGLE_SERVICE_ACCOUNT_JSON: ${parseError.message}`);
      }
      
      if (!credentials.type || credentials.type !== 'service_account') {
        throw new Error('Invalid service account credentials: missing or wrong type');
      }
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      let authClient;
      try {
        authClient = await auth.getClient();
      } catch (authError) {
        throw new Error(`Google authentication failed: ${authError.message}`);
      }
      
      const sheetsClient = google.sheets({ version: 'v4', auth: authClient });
      const spreadsheetId = process.env.LOG_SHEET_ID;
      
      if (!spreadsheetId) {
        throw new Error('LOG_SHEET_ID environment variable not found');
      }
      
      let spreadsheetData;
      try {
        const response = await sheetsClient.spreadsheets.get({ spreadsheetId });
        spreadsheetData = response.data;
      } catch (sheetsError) {
        if (sheetsError.code === 404) {
          throw new Error(`Spreadsheet not found: ${spreadsheetId}`);
        } else if (sheetsError.code === 403) {
          throw new Error(`Access denied to spreadsheet: ${spreadsheetId}`);
        } else {
          throw new Error(`Google Sheets API error: ${sheetsError.message}`);
        }
      }
      
      if (!spreadsheetData.sheets || spreadsheetData.sheets.length === 0) {
        throw new Error('Spreadsheet contains no sheets');
      }
      
      const sheetNames = spreadsheetData.sheets.map(sheet => sheet.properties.title);
      const requiredSheets = ['Call Data', 'Logs'];
      
      for (const requiredSheet of requiredSheets) {
        if (!sheetNames.includes(requiredSheet)) {
          throw new Error(`Required sheet '${requiredSheet}' not found. Available: ${sheetNames.join(', ')}`);
        }
      }
      
      return sheetNames;
    }, true);

    // Test 4: Resgrid API Connection
    await this.test('Resgrid API Connection', async () => {
      if (!process.env.RESGRID_USER) {
        throw new Error('RESGRID_USER environment variable not found');
      }
      
      if (!process.env.RESGRID_PASS) {
        throw new Error('RESGRID_PASS environment variable not found');
      }
      
      let tokenResponse;
      try {
        tokenResponse = await axios({
          method: 'POST',
          url: 'https://api.resgrid.com/api/v4/Security/Token',
          data: {
            Username: process.env.RESGRID_USER,
            Password: process.env.RESGRID_PASS
          },
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });
      } catch (tokenError) {
        if (tokenError.code === 'ENOTFOUND') {
          throw new Error('Cannot reach Resgrid API (DNS resolution failed)');
        } else if (tokenError.code === 'ECONNREFUSED') {
          throw new Error('Connection refused by Resgrid API');
        } else if (tokenError.response) {
          throw new Error(`Resgrid API returned ${tokenError.response.status}: ${tokenError.response.statusText}`);
        } else {
          throw new Error(`Network error connecting to Resgrid: ${tokenError.message}`);
        }
      }
      
      if (!tokenResponse.data || !tokenResponse.data.Tk) {
        throw new Error('Invalid response from Resgrid API: missing token');
      }
      
      const token = tokenResponse.data.Tk;
      
      // Test API call with token
      try {
        const testResponse = await axios({
          method: 'GET',
          url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        });
        
        if (testResponse.status !== 200) {
          throw new Error(`API test call failed with status ${testResponse.status}`);
        }
        
        return { token, activeCalls: testResponse.data.Data?.length || 0 };
      } catch (apiError) {
        if (apiError.response && apiError.response.status === 401) {
          throw new Error('API token is invalid or expired');
        } else if (apiError.response && apiError.response.status === 404) {
          this.recordWarning('Resgrid API', 'GetActiveCalls endpoint returned 404 - may be temporary');
          return { token, activeCalls: 'unknown' };
        } else {
          throw new Error(`API test call failed: ${apiError.message}`);
        }
      }
    });

    // Test 5: Environment Configuration
    await this.test('Environment Configuration', async () => {
      const requiredVars = [
        'RESGRID_USER',
        'RESGRID_PASS', 
        'GOOGLE_SERVICE_ACCOUNT_JSON',
        'LOG_SHEET_ID'
      ];
      
      const optionalVars = [
        'SFTP_HOST',
        'SFTP_USER',
        'SFTP_PASS',
        'SFTP_DIR'
      ];
      
      const missing = [];
      const misconfigured = [];
      
      for (const varName of requiredVars) {
        const value = process.env[varName];
        if (!value) {
          missing.push(varName);
        } else if (value.trim() === '') {
          misconfigured.push(`${varName} is empty`);
        }
      }
      
      if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
      }
      
      if (misconfigured.length > 0) {
        throw new Error(`Misconfigured environment variables: ${misconfigured.join(', ')}`);
      }
      
      // Check optional SFTP configuration
      const sftpVars = optionalVars.filter(v => process.env[v]);
      if (sftpVars.length > 0 && sftpVars.length < optionalVars.length) {
        const missingSftp = optionalVars.filter(v => !process.env[v]);
        this.recordWarning('Environment', `Partial SFTP configuration: missing ${missingSftp.join(', ')}`);
      }
      
      return { required: requiredVars.length, optional: sftpVars.length };
    }, true);

    // Test 6: Call Processing Pipeline
    await this.test('Call Processing Pipeline', async () => {
      const testCallId = '201579';
      
      let response;
      try {
        response = await axios.get(`${BASE_URL}/test/${testCallId}`, {
          timeout: 35000
        });
      } catch (testError) {
        if (testError.code === 'ECONNABORTED') {
          throw new Error('Call processing test timed out (35s)');
        } else if (testError.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to test endpoint');
        } else {
          throw new Error(`Test endpoint error: ${testError.message}`);
        }
      }
      
      if (response.status !== 200) {
        throw new Error(`Test endpoint returned status ${response.status}`);
      }
      
      const data = response.data;
      
      if (!data.hasOwnProperty('success')) {
        throw new Error('Test response missing success field');
      }
      
      if (!data.success) {
        const errorMsg = data.error || data.message || 'Unknown test failure';
        throw new Error(`Call processing test failed: ${errorMsg}`);
      }
      
      if (!data.callId || data.callId !== testCallId) {
        this.recordWarning('Call Processing', `Call ID mismatch: expected ${testCallId}, got ${data.callId}`);
      }
      
      return data;
    });

    // Test 7: Response Time Analysis
    await this.test('Response Time Analysis', async () => {
      const checks = 5;
      const times = [];
      const maxAcceptableTime = 3000; // 3 seconds
      
      for (let i = 0; i < checks; i++) {
        const start = Date.now();
        try {
          await axios.get(`${BASE_URL}/status`, { timeout: 5000 });
          const responseTime = Date.now() - start;
          times.push(responseTime);
          
          if (responseTime > maxAcceptableTime) {
            this.recordWarning('Response Time', `Slow response detected: ${responseTime}ms (check ${i + 1})`);
          }
        } catch (error) {
          throw new Error(`Response time check ${i + 1} failed: ${error.message}`);
        }
        
        if (i < checks - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);
      
      if (avgTime > maxAcceptableTime) {
        throw new Error(`Average response time too slow: ${avgTime}ms (max acceptable: ${maxAcceptableTime}ms)`);
      }
      
      return { average: avgTime, max: maxTime, min: minTime, samples: times };
    });

    // Test 8: Memory and Resource Analysis
    await this.test('Memory and Resource Analysis', async () => {
      const response = await axios.get(`${BASE_URL}/status`);
      const memory = response.data.memory;
      
      if (!memory) {
        throw new Error('Memory information not available in status response');
      }
      
      const memoryMB = Math.round(memory.rss / 1024 / 1024);
      const heapUsedMB = Math.round(memory.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(memory.heapTotal / 1024 / 1024);
      
      // Warning thresholds
      if (memoryMB > 500) {
        this.recordWarning('Memory', `High memory usage: ${memoryMB}MB RSS`);
      }
      
      if (heapUsedMB > 200) {
        this.recordWarning('Memory', `High heap usage: ${heapUsedMB}MB used`);
      }
      
      const heapUtilization = (heapUsedMB / heapTotalMB) * 100;
      if (heapUtilization > 90) {
        this.recordWarning('Memory', `High heap utilization: ${heapUtilization.toFixed(1)}%`);
      }
      
      return {
        rss: memoryMB,
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        utilization: heapUtilization
      };
    });

    // Generate comprehensive error report
    this.generateErrorReport();
    return this.results;
  }

  generateErrorReport() {
    console.log('\n=== COMPREHENSIVE ERROR ANALYSIS RESULTS ===');
    console.log(`Total Tests: ${this.results.total}`);
    console.log(`Passed: ${this.results.passed} ✅`);
    console.log(`Failed: ${this.results.failed} ❌`);
    
    const successRate = ((this.results.passed / this.results.total) * 100).toFixed(1);
    console.log(`Success Rate: ${successRate}%`);

    // Detailed Error Analysis
    if (this.results.errors.length > 0) {
      console.log('\n=== DETAILED ERROR ANALYSIS ===');
      this.results.errors.forEach((error, index) => {
        console.log(`\n${index + 1}. ${error.test} (${error.severity})`);
        console.log(`   Error: ${error.error}`);
        console.log(`   Time: ${error.timestamp}`);
        if (error.severity === 'CRITICAL') {
          console.log('   ⚠️  CRITICAL: This error affects core functionality');
        }
      });
    }

    // Warning Analysis
    if (this.results.warnings.length > 0) {
      console.log('\n=== WARNING ANALYSIS ===');
      this.results.warnings.forEach((warning, index) => {
        console.log(`${index + 1}. ${warning.test}: ${warning.warning}`);
      });
    }

    // Performance Analysis
    console.log('\n=== PERFORMANCE ANALYSIS ===');
    for (const [test, duration] of Object.entries(this.results.performance)) {
      const status = duration < 1000 ? '🟢' : duration < 3000 ? '🟡' : '🔴';
      console.log(`${status} ${test}: ${duration}ms`);
    }

    // System Health Summary
    if (this.results.systemHealth.status) {
      console.log('\n=== SYSTEM HEALTH SUMMARY ===');
      console.log(`Status: ${this.results.systemHealth.status}`);
      console.log(`Uptime: ${Math.floor(this.results.systemHealth.uptime)}s`);
      if (this.results.systemHealth.memory) {
        const memMB = Math.round(this.results.systemHealth.memory.rss / 1024 / 1024);
        console.log(`Memory: ${memMB}MB RSS`);
      }
    }

    // Recommendations
    console.log('\n=== RECOMMENDATIONS ===');
    if (this.results.errors.length === 0) {
      console.log('✅ No errors detected - system is functioning correctly');
    } else {
      const criticalErrors = this.results.errors.filter(e => e.severity === 'CRITICAL').length;
      if (criticalErrors > 0) {
        console.log(`🚨 ${criticalErrors} critical error(s) require immediate attention`);
      }
      console.log('📋 Review error details above for specific fixes needed');
    }

    if (this.results.warnings.length > 0) {
      console.log(`⚠️  ${this.results.warnings.length} warning(s) detected - review for optimization opportunities`);
    }

    console.log(`\nAnalysis completed: ${new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false
    })}`);
  }
}

// Execute comprehensive error analysis
const analyzer = new ComprehensiveErrorAnalysis();
analyzer.runComprehensiveErrorAnalysis().then(results => {
  process.exit(results.failed === 0 ? 0 : 1);
}).catch(error => {
  console.error('Error analysis failed:', error.message);
  process.exit(1);
});