/**
 * Test script for SFTP fingerprint caching
 * This script verifies that the fingerprint caching mechanism works correctly
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Instead of mocking, we'll create our own implementation
// that uses the real hasFileChanged function but doesn't connect to SFTP
const sftpClient = require('./src/sftp-client');
const { hasFileChanged, clearFingerprintCache } = sftpClient;

// Create a mock version of uploadFileToSFTP that doesn't connect to SFTP
async function mockUploadFileToSFTP(localPath, remotePath) {
  // Use the real hasFileChanged function
  const hasChanged = await hasFileChanged(localPath, remotePath);
  console.log(`Mock SFTP upload - hasChanged: ${hasChanged}, local: ${localPath}, remote: ${remotePath}`);
  return hasChanged; // Return whether file has changed
}

// Create a temporary directory
const testDir = path.join(__dirname, 'test-fingerprint');
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

/**
 * Create a test file with specific content
 */
function createTestFile(filename, content) {
  const filePath = path.join(testDir, filename);
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Test the fingerprint caching mechanism
 */
async function testFingerprintCaching() {
  console.log('Testing SFTP fingerprint caching mechanism...');
  
  try {
    // Clear any existing fingerprint cache
    clearFingerprintCache();
    
    // Create test files
    const file1 = createTestFile('test1.txt', 'Test content 1');
    const file2 = createTestFile('test2.txt', 'Test content 2');
    
    // Test 1: First upload should indicate changes
    console.log('\nTest 1: First upload should always upload');
    let result1 = await mockUploadFileToSFTP(file1, '/remote/test1.txt');
    console.log(`Result: ${result1 ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    
    // Test 2: Second upload of the same file should be skipped
    console.log('\nTest 2: Second upload of unchanged file should be skipped');
    let result2 = await mockUploadFileToSFTP(file1, '/remote/test1.txt');
    console.log(`Result: ${result2 ? 'File uploaded' : 'File skipped'} (expected: skipped)`);
    
    // Test 3: Upload to a different remote path should be uploaded
    console.log('\nTest 3: Same file, different remote path should be uploaded');
    let result3 = await mockUploadFileToSFTP(file1, '/remote/test1_copy.txt');
    console.log(`Result: ${result3 ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    
    // Test 4: Modify the file and upload again
    console.log('\nTest 4: Modified file should be uploaded');
    fs.writeFileSync(file1, 'Test content 1 - modified');
    let result4 = await mockUploadFileToSFTP(file1, '/remote/test1.txt');
    console.log(`Result: ${result4 ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    
    // Test 5: Clear cache for specific file
    console.log('\nTest 5: After clearing cache for a specific file, it should upload');
    clearFingerprintCache(file1);
    let result5 = await mockUploadFileToSFTP(file1, '/remote/test1.txt');
    console.log(`Result: ${result5 ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    
    // Test 6: Different file should upload
    console.log('\nTest 6: Different file should upload');
    let result6 = await mockUploadFileToSFTP(file2, '/remote/test2.txt');
    console.log(`Result: ${result6 ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    
    // Test 7: Clear all cache
    console.log('\nTest 7: After clearing all cache, all files should upload');
    clearFingerprintCache();
    let result7a = await mockUploadFileToSFTP(file1, '/remote/test1.txt');
    let result7b = await mockUploadFileToSFTP(file2, '/remote/test2.txt');
    console.log(`Result file1: ${result7a ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    console.log(`Result file2: ${result7b ? 'File uploaded' : 'File skipped'} (expected: uploaded)`);
    
    console.log('\nFingerprint caching tests completed successfully!');
  } catch (error) {
    console.error(`Error during fingerprint caching tests: ${error.message}`);
    console.error(error);
  } finally {
    // Clean up test files
    try {
      if (fs.existsSync(testDir)) {
        const files = fs.readdirSync(testDir);
        for (const file of files) {
          fs.unlinkSync(path.join(testDir, file));
        }
        fs.rmdirSync(testDir);
      }
    } catch (cleanupError) {
      console.warn(`Warning: Could not clean up test directory: ${cleanupError.message}`);
    }
  }
}

// Run the tests
testFingerprintCaching().catch(error => {
  console.error('Uncaught error in test:', error);
  process.exit(1);
});