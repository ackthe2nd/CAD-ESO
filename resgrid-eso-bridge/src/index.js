const { SignalRClient } = require('./signalr-client');
const { fetchCallExtraData } = require('./resgrid-api');
const { generateXML } = require('./xml-generator');
const { uploadFileToSFTP } = require('./sftp-client');
const { logger } = require('./logger');
const { config } = require('./config');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Create temp directory if it doesn't exist
const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Start the SignalR client
const signalRClient = new SignalRClient();

// Main process function
async function processCallAdded(callData) {
  try {
    logger.info(`Received CallAdded event for Call ID: ${callData.CallId}`);
    
    // Step 1: Fetch extra data from Resgrid API
    const callExtraData = await fetchCallExtraData(callData.CallId);
    if (!callExtraData) {
      logger.error(`Failed to fetch extra data for Call ID: ${callData.CallId}`);
      return;
    }
    
    // Step 2: Extract unit names from dispatches
    const unitDispatches = callExtraData.Dispatches.filter(d => d.Type === "Unit");
    const unitsCsv = unitDispatches.map(d => d.Name).join(', ');
    
    // Step 3: Generate XML
    const xmlData = generateXML({
      CallId: callData.CallId,
      Timestamp: callData.Timestamp || new Date().toISOString(),
      Nature: callData.Nature || callExtraData.Nature || '',
      Address: callData.Address || callExtraData.Address || '',
      UnitsCsv: unitsCsv,
      Notes: callData.Notes || callExtraData.Notes || ''
    });
    
    // Step 4: Save XML to temp file
    const fileName = `call_${callData.CallId}_${Date.now()}.xml`;
    const filePath = path.join(tempDir, fileName);
    fs.writeFileSync(filePath, xmlData);
    logger.info(`XML file created at: ${filePath}`);
    
    // Step 5: Upload to ESO via SFTP
    const remoteFilePath = `${config.sftp.remotePath}/${fileName}`;
    await uploadFileToSFTP(filePath, remoteFilePath);
    logger.info(`Successfully uploaded call ${callData.CallId} to ESO via SFTP`);
    
    // Clean up temp file
    fs.unlinkSync(filePath);
  } catch (error) {
    logger.error(`Error processing CallAdded event: ${error.message}`, { error });
  }
}

// Initialize the application
async function initialize() {
  try {
    logger.info('Starting Resgrid to ESO bridge service...');
    
    // Connect to SignalR and listen for CallAdded events
    await signalRClient.connect();
    signalRClient.onCallAdded(processCallAdded);
    
    // Setup graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down service...');
      await signalRClient.disconnect();
      process.exit(0);
    };
    
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
    
    logger.info('Service started successfully');
  } catch (error) {
    logger.error(`Failed to initialize service: ${error.message}`, { error });
    process.exit(1);
  }
}

// Start the application
initialize();

// Export for testing
module.exports = { processCallAdded };
