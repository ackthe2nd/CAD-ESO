const { generateXML } = require('./src/xml-generator');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Mock the SFTP client behavior
class MockSftpClient {
  constructor() {
    this.connected = false;
    this.files = {};
    console.log('Mock SFTP client created');
  }

  async connect(config) {
    console.log('Mock SFTP connecting to:', config.host);
    this.connected = true;
    return true;
  }

  async exists(remotePath) {
    console.log(`Checking if path exists: ${remotePath}`);
    return true; // Pretend the directory exists
  }

  async put(localPath, remotePath) {
    console.log(`Mock uploading file from ${localPath} to ${remotePath}`);
    
    // Actually read the local file
    const fileContent = fs.readFileSync(localPath, 'utf8');
    
    // Store it in our mock file system
    this.files[remotePath] = fileContent;
    
    console.log(`File content (${fileContent.length} bytes) stored in mock system at ${remotePath}`);
    return true;
  }

  async end() {
    console.log('Mock SFTP connection closed');
    this.connected = false;
    return true;
  }
}

/**
 * Test function to simulate the full workflow from XML generation to SFTP upload
 */
async function testFullWorkflow() {
  console.log('Testing full workflow with mocked SFTP...');
  
  // Create a sample call object
  const sampleCall = {
    CallId: '12345',
    Timestamp: new Date().toISOString(),
    Nature: 'TEST CALL - Medical Emergency',
    Address: '123 Test Street, Test City, TX',
    UnitsCsv: 'Engine 1, Medic 2, Battalion 3',
    Notes: 'This is a test call. Patient complaining of chest pain. BP 120/80, HR 90, SpO2 98%.'
  };
  
  try {
    // Step 1: Generate XML
    console.log('Generating XML for test call...');
    const xmlData = generateXML(sampleCall);
    
    // Step 2: Save to temp file
    const tempDir = path.join(os.tmpdir(), 'resgrid-eso-test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    const localFilePath = path.join(tempDir, `incident_${sampleCall.CallId}_temp.xml`);
    fs.writeFileSync(localFilePath, xmlData);
    console.log(`XML saved to temp file: ${localFilePath}`);
    
    // Step 3: Mock SFTP upload
    const mockSftp = new MockSftpClient();
    const mockRemotePath = '/incoming/calls/incident_12345.xml';
    
    await mockSftp.connect({
      host: 'sftp.example.com',
      port: 22,
      username: 'sftp_username',
      password: 'sftp_password'
    });
    
    await mockSftp.put(localFilePath, mockRemotePath);
    await mockSftp.end();
    
    // Step 4: Verify the mocked upload
    if (mockSftp.files[mockRemotePath]) {
      const uploadedContent = mockSftp.files[mockRemotePath];
      console.log('Mock SFTP upload successful!');
      console.log(`Uploaded file size: ${uploadedContent.length} bytes`);
      
      // Clean up temp file
      fs.unlinkSync(localFilePath);
      console.log(`Cleaned up temp file: ${localFilePath}`);
      
      console.log('Full workflow test completed successfully');
      return true;
    } else {
      throw new Error('Mock SFTP upload failed - file not found in mock storage');
    }
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

// Run the test
testFullWorkflow().then(success => {
  console.log(`Test ${success ? 'PASSED' : 'FAILED'}`);
});