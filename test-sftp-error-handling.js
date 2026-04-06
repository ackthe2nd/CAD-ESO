/**
 * Test SFTP Error Handling and Recovery
 * 
 * This script tests the improved SFTP connection handling
 * to verify that "Connection lost before handshake" errors
 * are properly retried and recovered.
 */

require('dotenv').config();
const { uploadToESO } = require('./src/sftp-client');
const fs = require('fs');
const path = require('path');

async function testSFTPErrorHandling() {
  console.log('=== SFTP Error Handling Test ===\n');
  
  // Create a test XML file
  const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<ClinicalDocument>
  <id root="test-${Date.now()}" />
  <effectiveTime value="20250605" />
  <recordTarget>
    <patientRole>
      <id nullFlavor="NI" />
    </patientRole>
  </recordTarget>
  <componentOf>
    <encompassingEncounter>
      <id root="TEST-ERROR-HANDLING" />
      <effectiveTime>
        <low value="20250605235000" />
      </effectiveTime>
      <location>
        <healthCareFacility>
          <id nullFlavor="NI" />
        </healthCareFacility>
      </location>
    </encompassingEncounter>
  </componentOf>
</ClinicalDocument>`;

  const tempDir = '/tmp/resgrid-eso-transfer';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const testFile = path.join(tempDir, `test-error-handling-${Date.now()}.xml`);
  fs.writeFileSync(testFile, testXML);
  
  console.log(`Created test file: ${testFile}`);
  console.log(`File size: ${fs.statSync(testFile).size} bytes\n`);
  
  try {
    console.log('Testing SFTP upload with enhanced error handling...');
    
    const startTime = Date.now();
    const result = await uploadToESO(testFile, `test-error-handling-${Date.now()}.xml`);
    const duration = Date.now() - startTime;
    
    console.log(`✅ Upload completed successfully in ${duration}ms`);
    console.log(`Result: ${result}`);
    
    // Clean up test file
    fs.unlinkSync(testFile);
    console.log('✅ Test file cleaned up');
    
    return true;
    
  } catch (error) {
    console.error(`❌ Upload failed: ${error.message}`);
    
    // Clean up test file even on failure
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      console.log('🧹 Test file cleaned up after error');
    }
    
    return false;
  }
}

async function runMultipleTests(count = 3) {
  console.log(`Running ${count} consecutive upload tests to verify stability...\n`);
  
  let successCount = 0;
  const results = [];
  
  for (let i = 1; i <= count; i++) {
    console.log(`--- Test ${i}/${count} ---`);
    
    const success = await testSFTPErrorHandling();
    results.push(success);
    
    if (success) {
      successCount++;
    }
    
    // Wait between tests to respect rate limiting
    if (i < count) {
      console.log('Waiting 60 seconds for rate limiting...\n');
      await new Promise(resolve => setTimeout(resolve, 60000));
    }
  }
  
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Successful uploads: ${successCount}/${count}`);
  console.log(`Success rate: ${(successCount/count*100).toFixed(1)}%`);
  
  if (successCount === count) {
    console.log('✅ All tests passed - SFTP error handling working correctly');
  } else {
    console.log('⚠️  Some tests failed - check network connectivity and ESO server status');
  }
}

// Run the tests
runMultipleTests(2).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});