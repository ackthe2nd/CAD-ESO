/**
 * Complete XML Integrity Verification Test
 * Tests the entire XML integrity system including upload verification and SFTP comparison
 */

require('dotenv').config();
const XMLIntegrityMonitor = require('./src/xml-integrity-monitor');
const { generateXML } = require('./src/xml-generator');
const { getApiToken } = require('./src/token-manager');
const { getCallExtraData } = require('./src/resgrid-api');
const CloudSftpClient = require('./src/sftp-client');
const logger = require('./src/fix-logger');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

class XMLIntegrityTester {
  constructor() {
    this.integrityMonitor = new XMLIntegrityMonitor();
    this.testResults = [];
    this.sftpClient = new CloudSftpClient({
      host: 'sftp.esosuite.net',
      username: 'CA-EMS',
      password: process.env.SFTP_PASSWORD,
      port: 22
    });
  }

  /**
   * Run comprehensive XML integrity tests
   */
  async runCompleteTest() {
    console.log('Starting Complete XML Integrity Verification Test\n');
    console.log('=' .repeat(60));

    try {
      // Test 1: Get a recent call for testing
      console.log('Test 1: Fetching recent call data...');
      const testCall = await this.getTestCall();
      if (!testCall) {
        console.log('❌ No test call available');
        return;
      }
      console.log(`✓ Using call ${testCall.callId} for testing\n`);

      // Test 2: Generate XML
      console.log('Test 2: Generating XML...');
      const xmlData = await this.generateTestXML(testCall);
      if (!xmlData) {
        console.log('❌ XML generation failed');
        return;
      }
      console.log(`✓ Generated XML (${xmlData.length} characters)\n`);

      // Test 3: Upload to SFTP
      console.log('Test 3: Uploading to SFTP...');
      const uploadResult = await this.uploadTestXML(testCall.callId, xmlData);
      if (!uploadResult.success) {
        console.log(`❌ SFTP upload failed: ${uploadResult.error}`);
        return;
      }
      console.log(`✓ Uploaded to SFTP: ${uploadResult.filename}\n`);

      // Test 4: Verify integrity
      console.log('Test 4: Verifying XML integrity...');
      const integrityResult = await this.integrityMonitor.verifyCallIntegrity(
        testCall.callId, 
        xmlData, 
        new Date().toISOString(), 
        uploadResult.filename
      );
      
      if (integrityResult.verified) {
        console.log('✓ XML integrity verification PASSED');
        console.log(`  Expected length: ${integrityResult.expectedLength}`);
        console.log(`  Uploaded length: ${integrityResult.uploadedLength}`);
      } else {
        console.log(`❌ XML integrity verification FAILED: ${integrityResult.reason}`);
        if (integrityResult.expectedLength && integrityResult.uploadedLength) {
          console.log(`  Expected length: ${integrityResult.expectedLength}`);
          console.log(`  Uploaded length: ${integrityResult.uploadedLength}`);
        }
      }
      console.log();

      // Test 5: Check integrity monitoring endpoint
      console.log('Test 5: Testing integrity monitoring endpoint...');
      const endpointResult = await this.testIntegrityEndpoint();
      if (endpointResult.success) {
        console.log('✓ Integrity endpoint working');
        console.log(`  Total checked: ${endpointResult.data.integrity.totalChecked}`);
        console.log(`  Match rate: ${endpointResult.data.integrity.matchRate}%`);
      } else {
        console.log(`❌ Integrity endpoint failed: ${endpointResult.error}`);
      }
      console.log();

      // Test 6: Manual SFTP verification
      console.log('Test 6: Manual SFTP file verification...');
      const manualCheck = await this.manualSftpVerification(uploadResult.filename, xmlData);
      if (manualCheck.success) {
        console.log('✓ Manual SFTP verification PASSED');
        console.log(`  File exists: ${manualCheck.exists}`);
        console.log(`  Content matches: ${manualCheck.contentMatch}`);
      } else {
        console.log(`❌ Manual SFTP verification FAILED: ${manualCheck.error}`);
      }
      console.log();

      // Cleanup
      console.log('Test 7: Cleanup...');
      await this.cleanup(uploadResult.filename);
      console.log('✓ Cleanup completed\n');

      // Generate final report
      this.generateFinalReport(integrityResult, endpointResult, manualCheck);

    } catch (error) {
      console.error(`Test failed with error: ${error.message}`);
    }
  }

  /**
   * Get a recent active call for testing
   */
  async getTestCall() {
    try {
      const token = await getApiToken();
      if (!token) return null;

      const response = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data && response.data.Data && response.data.Data.length > 0) {
        const call = response.data.Data[0];
        const extraData = await getCallExtraData(call.CallId);
        
        return {
          callId: call.CallId,
          callData: call,
          extraData: extraData
        };
      }

      return null;
    } catch (error) {
      console.error(`Error fetching test call: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate XML for testing
   */
  async generateTestXML(testCall) {
    try {
      const xmlResult = await generateXML(testCall.callData, testCall.extraData, true);
      return typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    } catch (error) {
      console.error(`Error generating XML: ${error.message}`);
      return null;
    }
  }

  /**
   * Upload test XML to SFTP
   */
  async uploadTestXML(callId, xmlData) {
    try {
      const timestamp = Date.now();
      const filename = `test_integrity_${callId}_${timestamp}.xml`;
      const tempDir = path.join(__dirname, 'temp');
      
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const localPath = path.join(tempDir, filename);
      fs.writeFileSync(localPath, xmlData);

      const remotePath = `/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9/${filename}`;

      await this.sftpClient.connect();
      await this.sftpClient.uploadFile(localPath, remotePath);
      await this.sftpClient.disconnect();

      fs.unlinkSync(localPath);

      return { success: true, filename };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Test the integrity monitoring endpoint
   */
  async testIntegrityEndpoint() {
    try {
      const response = await axios.get('http://localhost:5000/integrity');
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Manual SFTP verification
   */
  async manualSftpVerification(filename, expectedContent) {
    try {
      await this.sftpClient.connect();
      
      const remotePath = `/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9/${filename}`;
      const exists = await this.sftpClient.sftp.exists(remotePath);
      
      if (!exists) {
        await this.sftpClient.disconnect();
        return { success: false, error: 'File does not exist on SFTP' };
      }

      const tempDir = path.join(__dirname, 'temp');
      const localPath = path.join(tempDir, `verify_${filename}`);
      
      await this.sftpClient.sftp.get(remotePath, localPath);
      const actualContent = fs.readFileSync(localPath, 'utf8');
      
      const contentMatch = this.normalizeXML(expectedContent) === this.normalizeXML(actualContent);
      
      fs.unlinkSync(localPath);
      await this.sftpClient.disconnect();

      return {
        success: true,
        exists: true,
        contentMatch,
        expectedLength: expectedContent.length,
        actualLength: actualContent.length
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Normalize XML for comparison
   */
  normalizeXML(xml) {
    return xml
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Cleanup test files
   */
  async cleanup(filename) {
    try {
      await this.sftpClient.connect();
      const remotePath = `/CA-EMS/b394de98-a5b7-408d-a1f2-020eddff92b9/${filename}`;
      await this.sftpClient.sftp.delete(remotePath);
      await this.sftpClient.disconnect();
      
      // Clean up temp directory
      const tempDir = path.join(__dirname, 'temp');
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(tempDir, file));
        }
        fs.rmdirSync(tempDir);
      }
    } catch (error) {
      console.warn(`Cleanup warning: ${error.message}`);
    }
  }

  /**
   * Generate final test report
   */
  generateFinalReport(integrityResult, endpointResult, manualCheck) {
    console.log('=' .repeat(60));
    console.log('FINAL XML INTEGRITY TEST REPORT');
    console.log('=' .repeat(60));
    
    let passedTests = 0;
    let totalTests = 3;

    console.log('Test Results:');
    
    if (integrityResult.verified) {
      console.log('✓ XML Integrity Monitor: PASSED');
      passedTests++;
    } else {
      console.log('❌ XML Integrity Monitor: FAILED');
    }

    if (endpointResult.success) {
      console.log('✓ Integrity Endpoint: PASSED');
      passedTests++;
    } else {
      console.log('❌ Integrity Endpoint: FAILED');
    }

    if (manualCheck.success && manualCheck.contentMatch) {
      console.log('✓ Manual Verification: PASSED');
      passedTests++;
    } else {
      console.log('❌ Manual Verification: FAILED');
    }

    console.log();
    console.log(`Overall Score: ${passedTests}/${totalTests} tests passed`);
    
    if (passedTests === totalTests) {
      console.log('🎉 ALL TESTS PASSED - XML integrity system is fully operational!');
    } else if (passedTests >= 2) {
      console.log('⚠️  MOSTLY WORKING - Minor issues detected, review logs');
    } else {
      console.log('❌ MAJOR ISSUES - XML integrity system needs attention');
    }
    
    console.log('=' .repeat(60));
  }
}

// Run the complete test
async function main() {
  const tester = new XMLIntegrityTester();
  await tester.runCompleteTest();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = XMLIntegrityTester;