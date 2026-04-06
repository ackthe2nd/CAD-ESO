const fs = require('fs');
const path = require('path');
const os = require('os');
require('dotenv').config();

// Create temp directory if it doesn't exist
const tempDir = path.join(os.tmpdir(), 'resgrid-eso-test');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Mock the API functions to avoid actual API calls
const mockApiClient = {
  getApiToken: async () => {
    console.log('Mock: Getting API token');
    return 'mock-api-token-12345';
  },
  
  fetchCallExtraData: async (callId) => {
    console.log(`Mock: Fetching extra data for Call ID: ${callId}`);
    // Return mock data that resembles what the real API would return
    return {
      CallId: callId,
      Nature: 'MOCK CALL - Structure Fire',
      Address: '789 Test Avenue, Test City, TX 75001',
      Notes: 'This is a mock call from API with additional details. Smoke visible from basement.',
      Dispatches: [
        { Type: 'Unit', Name: 'Engine 5' },
        { Type: 'Unit', Name: 'Ladder 2' },
        { Type: 'Unit', Name: 'Battalion 1' },
        { Type: 'Person', Name: 'Chief Smith' }
      ]
    };
  }
};

// Mock the SFTP client
const mockSftpClient = {
  uploadFileToSFTP: async (localPath, remotePath) => {
    console.log(`Mock: Uploading file from ${localPath} to ${remotePath}`);
    // Read the file to verify it exists
    const fileContent = fs.readFileSync(localPath, 'utf8');
    console.log(`Mock: Successfully uploaded file (${fileContent.length} bytes)`);
    return true;
  }
};

// Import real XML generator
const { generateXML } = require('./src/xml-generator');

/**
 * Process a call similar to how the real service would
 */
async function processCallMock(callData) {
  console.log(`Mock processCall started for Call ID: ${callData.CallId}`);
  
  try {
    // Step 1: Get API token (mocked)
    const token = await mockApiClient.getApiToken();
    console.log(`Mock API token obtained: ${token.substring(0, 10)}...`);
    
    // Step 2: Fetch extra call data (mocked)
    const callExtraData = await mockApiClient.fetchCallExtraData(callData.CallId);
    console.log('Mock extra call data obtained:', JSON.stringify(callExtraData, null, 2));
    
    // Step 3: Extract unit names from dispatches
    const unitDispatches = callExtraData.Dispatches.filter(d => d.Type === "Unit");
    const unitsCsv = unitDispatches.map(d => d.Name).join(', ');
    console.log(`Units CSV: ${unitsCsv}`);
    
    // Step 4: Generate real XML (using actual XML generator)
    const xmlData = generateXML({
      CallId: callData.CallId,
      Timestamp: callData.Timestamp || new Date().toISOString(),
      Nature: callData.Nature || callExtraData.Nature || '',
      Address: callData.Address || callExtraData.Address || '',
      UnitsCsv: unitsCsv,
      Notes: callData.Notes || callExtraData.Notes || ''
    });
    
    // Step 5: Save XML to temp file
    const fileName = `call_${callData.CallId}_${Date.now()}.xml`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, xmlData);
    console.log(`XML file created at: ${filePath}`);
    
    // Step 6: Mock upload to ESO via SFTP
    const remoteFilePath = `/incoming/calls/${fileName}`;
    await mockSftpClient.uploadFileToSFTP(filePath, remoteFilePath);
    console.log(`Successfully uploaded call ${callData.CallId} to ESO via mock SFTP`);
    
    // Step 7: Clean up temp file
    fs.unlinkSync(filePath);
    console.log(`Cleaned up temp file: ${filePath}`);
    
    console.log(`✅ Call ${callData.CallId} processed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing call ${callData.CallId}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return false;
  }
}

/**
 * Main test function
 */
async function runTest() {
  console.log('Starting full workflow integration test...');
  
  // Create a sample call that simulates what would come from SignalR
  const testCall = {
    CallId: '67890',
    Timestamp: new Date().toISOString(),
    Nature: 'STRUCTURE FIRE',
    Address: '123 Main St, Test City',
    Notes: 'Initial report of smoke from basement'
  };
  
  console.log('Test call data:', JSON.stringify(testCall, null, 2));
  
  // Process the call through our mock workflow
  const success = await processCallMock(testCall);
  
  if (success) {
    console.log('INTEGRATION TEST PASSED: Full workflow executed successfully');
  } else {
    console.error('INTEGRATION TEST FAILED: Workflow did not complete');
    process.exit(1);
  }
}

// Run the test
runTest();