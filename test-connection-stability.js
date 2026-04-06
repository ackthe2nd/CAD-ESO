/**
 * Connection Stability Tester
 * 
 * This tool performs comprehensive testing of SFTP connections to identify
 * and resolve "Connection lost before handshake" errors.
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');

class ConnectionTester {
  constructor() {
    this.testResults = [];
    this.successCount = 0;
    this.failureCount = 0;
  }

  log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const level = isError ? 'ERROR' : 'INFO';
    console.log(`${timestamp} [${level}]: ${message}`);
  }

  async testSingleConnection(testNumber, delay = 0) {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    const startTime = Date.now();
    const sftp = new SftpClient();
    
    try {
      this.log(`Test ${testNumber}: Starting connection attempt`);
      
      // Test with different connection configurations
      const configs = [
        {
          name: 'Standard',
          config: {
            host: process.env.SFTP_HOST,
            port: parseInt(process.env.SFTP_PORT) || 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS,
            retries: 3,
            retry_factor: 2,
            retry_minTimeout: 2000
          }
        },
        {
          name: 'Enhanced',
          config: {
            host: process.env.SFTP_HOST,
            port: parseInt(process.env.SFTP_PORT) || 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS,
            retries: 3,
            retry_factor: 2,
            retry_minTimeout: 2000,
            keepaliveInterval: 30000,
            keepaliveCountMax: 3,
            readyTimeout: 20000,
            algorithms: {
              serverHostKey: ['ssh-rsa', 'ssh-dss'],
              kex: ['diffie-hellman-group14-sha1', 'diffie-hellman-group1-sha1']
            }
          }
        },
        {
          name: 'Conservative',
          config: {
            host: process.env.SFTP_HOST,
            port: parseInt(process.env.SFTP_PORT) || 22,
            username: process.env.SFTP_USER,
            password: process.env.SFTP_PASS,
            retries: 5,
            retry_factor: 3,
            retry_minTimeout: 5000,
            readyTimeout: 30000,
            debug: false
          }
        }
      ];

      for (const configTest of configs) {
        const configStartTime = Date.now();
        
        try {
          this.log(`Test ${testNumber}.${configTest.name}: Connecting...`);
          
          await sftp.connect(configTest.config);
          
          const connectionTime = Date.now() - configStartTime;
          this.log(`Test ${testNumber}.${configTest.name}: Connected in ${connectionTime}ms`);
          
          // Test upload
          const testData = `<?xml version="1.0"?><test id="${testNumber}-${configTest.name}" time="${Date.now()}" />`;
          const remoteFile = `${process.env.SFTP_DIR}/test-${testNumber}-${configTest.name}-${Date.now()}.xml`;
          
          await sftp.put(Buffer.from(testData), remoteFile);
          
          const totalTime = Date.now() - configStartTime;
          this.log(`Test ${testNumber}.${configTest.name}: SUCCESS in ${totalTime}ms`);
          
          this.testResults.push({
            test: `${testNumber}.${configTest.name}`,
            status: 'SUCCESS',
            time: totalTime,
            config: configTest.name
          });
          
          this.successCount++;
          break; // Success, move to next test
          
        } catch (configError) {
          const errorTime = Date.now() - configStartTime;
          this.log(`Test ${testNumber}.${configTest.name}: FAILED in ${errorTime}ms - ${configError.message}`, true);
          
          this.testResults.push({
            test: `${testNumber}.${configTest.name}`,
            status: 'FAILED',
            time: errorTime,
            error: configError.message,
            config: configTest.name
          });
          
          if (configTest === configs[configs.length - 1]) {
            this.failureCount++;
          }
        }
      }
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      this.log(`Test ${testNumber}: COMPLETE FAILURE in ${totalTime}ms - ${error.message}`, true);
      this.failureCount++;
      
    } finally {
      try {
        await sftp.end();
      } catch (closeError) {
        // Ignore close errors
      }
    }
  }

  async runStabilityTest(testCount = 10, delayBetweenTests = 5000) {
    this.log(`Starting stability test with ${testCount} connections`);
    this.log(`Delay between tests: ${delayBetweenTests}ms`);
    
    for (let i = 1; i <= testCount; i++) {
      await this.testSingleConnection(i, i > 1 ? delayBetweenTests : 0);
      
      // Progress update
      const progress = Math.round((i / testCount) * 100);
      this.log(`Progress: ${progress}% (${i}/${testCount})`);
    }
  }

  async runConcurrentTest(concurrentConnections = 3) {
    this.log(`Starting concurrent test with ${concurrentConnections} simultaneous connections`);
    
    const promises = [];
    for (let i = 1; i <= concurrentConnections; i++) {
      promises.push(this.testSingleConnection(`C${i}`));
    }
    
    await Promise.allSettled(promises);
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('CONNECTION STABILITY TEST REPORT');
    console.log('='.repeat(60));
    
    console.log(`\nOVERALL RESULTS:`);
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`Successful: ${this.successCount}`);
    console.log(`Failed: ${this.failureCount}`);
    console.log(`Success Rate: ${((this.successCount / this.testResults.length) * 100).toFixed(1)}%`);
    
    // Group results by config type
    const configResults = {};
    this.testResults.forEach(result => {
      if (!configResults[result.config]) {
        configResults[result.config] = { success: 0, failed: 0, times: [] };
      }
      
      if (result.status === 'SUCCESS') {
        configResults[result.config].success++;
        configResults[result.config].times.push(result.time);
      } else {
        configResults[result.config].failed++;
      }
    });
    
    console.log(`\nCONFIGURATION PERFORMANCE:`);
    Object.keys(configResults).forEach(config => {
      const stats = configResults[config];
      const avgTime = stats.times.length > 0 ? 
        Math.round(stats.times.reduce((a, b) => a + b, 0) / stats.times.length) : 0;
      
      console.log(`${config}:`);
      console.log(`  Success: ${stats.success}, Failed: ${stats.failed}`);
      console.log(`  Avg Time: ${avgTime}ms`);
    });
    
    // Show failed tests
    const failures = this.testResults.filter(r => r.status === 'FAILED');
    if (failures.length > 0) {
      console.log(`\nFAILURE ANALYSIS:`);
      const errorTypes = {};
      failures.forEach(failure => {
        const errorType = failure.error.toLowerCase();
        if (!errorTypes[errorType]) {
          errorTypes[errorType] = 0;
        }
        errorTypes[errorType]++;
      });
      
      Object.keys(errorTypes).forEach(error => {
        console.log(`${error}: ${errorTypes[error]} occurrences`);
      });
    }
    
    // Recommendations
    console.log(`\nRECOMMENDATIONS:`);
    const successRate = (this.successCount / this.testResults.length) * 100;
    
    if (successRate >= 90) {
      console.log('✅ Connection stability is good');
    } else if (successRate >= 70) {
      console.log('⚠️  Moderate connection issues detected');
      console.log('   - Consider increasing retry delays');
      console.log('   - Use conservative connection settings');
    } else {
      console.log('❌ Significant connection issues detected');
      console.log('   - Network connectivity problems likely');
      console.log('   - Contact ESO support for server status');
      console.log('   - Consider firewall or ISP routing issues');
    }
  }
}

async function main() {
  const tester = new ConnectionTester();
  
  console.log('SFTP Connection Stability Testing');
  console.log('=================================\n');
  
  console.log('Configuration:');
  console.log(`Host: ${process.env.SFTP_HOST}`);
  console.log(`User: ${process.env.SFTP_USER}`);
  console.log(`Directory: ${process.env.SFTP_DIR}\n`);
  
  try {
    // Run sequential stability test
    await tester.runStabilityTest(5, 3000);
    
    // Small delay before concurrent test
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Run concurrent test
    await tester.runConcurrentTest(2);
    
    // Generate report
    tester.generateReport();
    
  } catch (error) {
    console.error(`Test execution failed: ${error.message}`);
    process.exit(1);
  }
}

main();