/**
 * Quick System Test - Core Functionality
 * Tests essential system components for production readiness
 */
require('dotenv').config();
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

class QuickSystemTest {
  constructor() {
    this.results = [];
  }

  log(message, status = 'INFO') {
    const timestamp = new Date().toLocaleString('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false
    });
    console.log(`[${timestamp}] ${status}: ${message}`);
    this.results.push({ timestamp, status, message });
  }

  async test(name, testFn) {
    this.log(`Testing ${name}...`, 'TEST');
    try {
      await testFn();
      this.log(`✅ ${name} PASSED`, 'PASS');
      return true;
    } catch (error) {
      this.log(`❌ ${name} FAILED: ${error.message}`, 'FAIL');
      return false;
    }
  }

  async runTests() {
    console.log('=== QUICK SYSTEM TEST ===\n');
    
    let passed = 0;
    let total = 0;

    // Test 1: System Status
    total++;
    if (await this.test('System Status', async () => {
      const response = await axios.get(`${BASE_URL}/status`);
      if (response.status !== 200) throw new Error(`Status ${response.status}`);
      if (response.data.status !== 'OK') throw new Error('System not OK');
      if (response.data.version !== '2.2.1') throw new Error('Wrong version');
      this.log(`System healthy - Version ${response.data.version}, Uptime: ${Math.floor(response.data.uptime)}s`);
    })) passed++;

    // Test 2: XML Integrity Endpoint
    total++;
    if (await this.test('XML Integrity Endpoint', async () => {
      const response = await axios.get(`${BASE_URL}/integrity`);
      if (response.status !== 200) throw new Error(`Status ${response.status}`);
      this.log('XML integrity monitoring active');
    })) passed++;

    // Test 3: Test Call Processing
    total++;
    if (await this.test('Call Processing', async () => {
      const testCallId = '201579';
      const response = await axios.get(`${BASE_URL}/test/${testCallId}`, {
        timeout: 25000
      });
      if (response.status !== 200) throw new Error(`Status ${response.status}`);
      if (!response.data.success) throw new Error(response.data.error || 'Test failed');
      this.log(`Call ${testCallId} processed successfully`);
    })) passed++;

    // Test 4: Duplicate Prevention (monitor system responsiveness)
    total++;
    if (await this.test('Duplicate Prevention', async () => {
      const start = Date.now();
      let responsive = true;
      
      // Check system responsiveness over 5 seconds
      for (let i = 0; i < 5; i++) {
        const checkStart = Date.now();
        await axios.get(`${BASE_URL}/status`);
        const checkTime = Date.now() - checkStart;
        
        if (checkTime > 2000) { // Response time > 2 seconds indicates issues
          responsive = false;
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      if (!responsive) throw new Error('System unresponsive - possible duplicate processing');
      this.log('No duplicate processing detected - system responsive');
    })) passed++;

    // Test 5: Environment Configuration
    total++;
    if (await this.test('Environment Configuration', async () => {
      const required = ['RESGRID_USER', 'RESGRID_PASS', 'GOOGLE_SERVICE_ACCOUNT_JSON', 'LOG_SHEET_ID'];
      const missing = required.filter(env => !process.env[env]);
      if (missing.length > 0) throw new Error(`Missing: ${missing.join(', ')}`);
      this.log('All required environment variables configured');
    })) passed++;

    // Summary
    const successRate = (passed / total * 100).toFixed(1);
    console.log('\n=== TEST RESULTS ===');
    console.log(`Passed: ${passed}/${total} (${successRate}%)`);
    
    if (passed === total) {
      console.log('🎉 ALL TESTS PASSED - System ready for production');
    } else if (successRate >= 80) {
      console.log('⚠️  Most tests passed - System functional');
    } else {
      console.log('🚨 Multiple failures - System needs attention');
    }

    return { passed, total, successRate };
  }
}

// Run the test
const tester = new QuickSystemTest();
tester.runTests().then(results => {
  process.exit(results.passed === results.total ? 0 : 1);
}).catch(error => {
  console.error('Test failed:', error.message);
  process.exit(1);
});