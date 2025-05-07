/**
 * Resgrid to ESO Bridge Application
 * 
 * This application listens for new calls from Resgrid via SignalR,
 * processes them, generates XML files according to ESO's format,
 * and uploads them via SFTP.
 */
const signalR = require('@microsoft/signalr');
const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
// Use our fixed logger implementation
const logger = require('./fix-logger');
const { sheetCallRow } = require('./sheets-logger');
const { create } = require('xmlbuilder2');

// For backward compatibility
const legacyLog = (message, isError = false) => {
  if (isError) {
    console.error(message);
    logger.error(message);
  } else {
    console.log(message);
    logger.info(message);
  }
};
const { config } = require('./config');
const { getApiToken } = require('./token-manager');
const { getCallExtraData } = require('./resgrid-api');
const { mapPriorityToEsoCode, DEFAULT_RESPONSE_MODE } = require('./utils/priority');
const { generateXML } = require('./xml-generator');

// For backward compatibility
const log = legacyLog;

// Create temp directory for storing XML files
const tempDir = path.join(os.tmpdir(), 'resgrid-eso-transfer');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
  logger.info(`Created temporary directory: ${tempDir}`);
}

// Ensure logs directory exists
const logsDir = config.app.logsDir;
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  logger.info(`Created logs directory: ${logsDir}`);
}

/**
 * Legacy XML generator (deprecated - kept for reference)
 * @deprecated Use the imported generateXML from xml-generator.js instead
 */
function legacyGenerateXML(callData) {
  try {
    logger.info(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Log available fields for debugging
    logger.debug('Available call data fields: ' + Object.keys(callData).join(', '));
    
    // Create base XML document with required fields
    const doc = create({ version: '1.0', encoding: 'UTF-8' })
      .ele('CadIncident', { 'xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance' })
        .ele('Guid').txt(config.esoGuid).up()
        .ele('IncidentNumber').txt(callData.CallId).up()
        .ele('IncidentOrOnset').txt(callData.Timestamp || new Date().toISOString()).up()
        .ele('ComplaintReportedByDispatch').txt(callData.Nature || '').up()
        .ele('VehicleDispatchLocation').txt(callData.Address || '').up()
        .ele('EmsUnitCallSign').txt(callData.UnitsCsv || '').up()
        .ele('CadDispatchText').txt(callData.Notes || '').up();
    
    // Add ResponseModeToScene - use provided value or map from Priority.Id, or fall back to default
    let responseModeToScene;
    
    if (callData.ResponseModeToScene) {
      // Use explicitly provided value if available
      responseModeToScene = callData.ResponseModeToScene;
      logger.info(`Using provided ResponseModeToScene: ${responseModeToScene}`);
    } else if (callData.Priority && callData.Priority.Id) {
      // Map from Priority.Id using our centralized utility
      responseModeToScene = mapPriorityToEsoCode(callData.Priority.Id);
      logger.info(`Mapped Priority.Id ${callData.Priority.Id} to ResponseModeToScene ${responseModeToScene}`);
    } else {
      // Fall back to default response mode
      responseModeToScene = DEFAULT_RESPONSE_MODE;
      logger.warn(`No Priority.Id available, using default ResponseModeToScene: ${responseModeToScene}`);
    }
    
    // Add to the XML document
    doc.ele('ResponseModeToScene').txt(responseModeToScene).up();
    
    // Add detailed address fields if available
    if (callData.IncidentAddress1) {
      doc.ele('IncidentAddress1').txt(callData.IncidentAddress1).up();
    }
    
    if (callData.IncidentAddress2) {
      doc.ele('IncidentAddress2').txt(callData.IncidentAddress2).up();
    }
    
    // Add location information
    if (callData.City) {
      doc.ele('IncidentCity').txt(callData.City).up();
    }
    
    if (callData.County) {
      doc.ele('IncidentCounty').txt(callData.County).up();
    }
    
    if (callData.State) {
      doc.ele('IncidentState').txt(callData.State).up();
    }
    
    if (callData.Zip) {
      doc.ele('IncidentZip').txt(callData.Zip).up();
    }
    
    if (callData.DestinationName) {
      doc.ele('DestinationName').txt(callData.DestinationName).up();
    }
    
    // EMD_Performed tag has been removed as requested
    
    // Add location details
    if (callData.GeoLocation) {
      doc.ele('GeoLocation').txt(callData.GeoLocation).up();
    }
    
    if (callData.CrossStreet) {
      doc.ele('CrossStreet').txt(callData.CrossStreet).up();
    }
    
    // Add caller information
    if (callData.ReportingParty) {
      doc.ele('ReportingParty').txt(callData.ReportingParty).up();
    }
    
    if (callData.ReportingPhone) {
      doc.ele('ContactPhone').txt(callData.ReportingPhone).up();
    }
    
    // Add additional identifiers
    if (callData.MapPage) {
      doc.ele('MapPage').txt(callData.MapPage).up();
    }
    
    if (callData.RunNumber) {
      doc.ele('RunNumber').txt(callData.RunNumber).up();
    }
    
    // Add call status
    if (callData.CallStatus) {
      doc.ele('CAD_VehicleDisposition').txt(callData.CallStatus).up();
    }
    
    // Add driver information
    if (callData.Driver) {
      doc.ele('Driver').txt(callData.Driver).up();
    }
    
    // Add timestamps
    if (callData.TransferOfPatientTime) {
      doc.ele('TransferOfPatientTimeOnScene').txt(callData.TransferOfPatientTime).up();
    }
    
    if (callData.DispatchClosedTime) {
      doc.ele('CAD_ClosedTime').txt(callData.DispatchClosedTime).up();
    }
    
    if (callData.UnitNotifiedTime) {
      doc.ele('CAD_UnitNotifiedTime').txt(callData.UnitNotifiedTime).up();
    }
    
    if (callData.UnitEnRouteTime) {
      doc.ele('CAD_EnrouteTime').txt(callData.UnitEnRouteTime).up();
    }
    
    if (callData.UnitArrivedTime) {
      doc.ele('CAD_ArrivedTime').txt(callData.UnitArrivedTime).up();
    }
    
    const xmlString = doc.end({ prettyPrint: true });
    logger.info(`Successfully generated XML for Call ID: ${callData.CallId}`);
    
    return xmlString;
  } catch (error) {
    logger.error(`Error generating XML for Call ID: ${callData.CallId}`, { 
      error: error.message,
      callId: callData.CallId
    });
    throw error;
  }
}

/**
 * Uploads a file to ESO via SFTP
 */
async function uploadToSFTP(localFilePath, remoteFilePath) {
  const sftp = new SftpClient();
  let retryCount = 0;
  const maxRetries = config.app.maxRetries;
  
  // Calculate retry delays with exponential backoff
  const getRetryDelay = (attempt) => {
    const baseDelay = config.app.retryDelay;
    return Math.min(baseDelay * Math.pow(2, attempt), 30000); // Cap at 30 seconds
  };
  
  while (retryCount <= maxRetries) {
    try {
      logger.info(`Connecting to SFTP server: ${config.sftp.host}`);
      
      await sftp.connect({
        host: config.sftp.host,
        port: config.sftp.port,
        username: config.sftp.username,
        password: config.sftp.password
      });
      
      logger.info(`Connected to SFTP server successfully`);
      
      // Ensure remote path exists
      const remoteDirExists = await sftp.exists(config.sftp.remotePath);
      if (!remoteDirExists) {
        logger.info(`Remote directory ${config.sftp.remotePath} does not exist, creating it`);
        await sftp.mkdir(config.sftp.remotePath, true);
      }
      
      // Ensure calls subdirectory exists
      const remoteCallsDir = path.join(config.sftp.remotePath, 'calls');
      const remoteCallsDirExists = await sftp.exists(remoteCallsDir);
      if (!remoteCallsDirExists) {
        logger.info(`Remote directory ${remoteCallsDir} does not exist, creating it`);
        await sftp.mkdir(remoteCallsDir, true);
      }
      
      // Upload the file
      logger.info(`Uploading file from ${localFilePath} to ${remoteFilePath}`);
      await sftp.put(localFilePath, remoteFilePath);
      logger.info(`Successfully uploaded file to ${remoteFilePath}`);
      
      // Close the connection
      await sftp.end();
      logger.info('SFTP connection closed');
      
      return true;
    } catch (error) {
      retryCount++;
      
      if (retryCount <= maxRetries) {
        const delay = getRetryDelay(retryCount - 1);
        logger.warn(`SFTP upload attempt ${retryCount} failed: ${error.message}. Retrying in ${delay}ms...`);
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        logger.error(`SFTP upload failed after ${maxRetries} attempts`, { error: error.message });
        
        // Close connection if it's still open
        try {
          await sftp.end();
        } catch (e) {
          // Ignore errors during disconnection
        }
        
        throw error;
      }
    }
  }
}

/**
 * Processes a new call from Resgrid
 */
async function processCallAdded(callData) {
  try {
    logger.info(`Received CallAdded event for Call ID: ${callData.CallId}`);
    
    // Fetch additional data for the call
    logger.info(`Fetching extra data for Call ID: ${callData.CallId}`);
    
    const callExtraData = await getCallExtraData(callData.CallId);
    if (!callExtraData) {
      logger.error(`Failed to fetch extra data for Call ID: ${callData.CallId}`);
      return;
    }
    
    // Extract or generate units CSV list
    let unitsCsv = '';
    
    // Filter and extract unit names from dispatches
    if (callExtraData.Dispatches && Array.isArray(callExtraData.Dispatches)) {
      const units = callExtraData.Dispatches
        .filter(d => d.Type === 'Unit' && /^\d{4,5}$/.test(d.Name))
        .map(d => d.Name);
      
      unitsCsv = units.join(', ');
      logger.info(`Extracted units: ${unitsCsv}`);
    } else {
      logger.warn(`No dispatches found for Call ID: ${callData.CallId}`);
    }
    
    // Extract address components
    let addressLine1 = callExtraData.AddressLine1 || callData.Address || '';
    let addressLine2 = callExtraData.AddressLine2 || '';
    let city = callExtraData.City || '';
    let state = callExtraData.State || '';
    let zip = callExtraData.ZipCode || callExtraData.Zip || '';
    let county = callExtraData.County || '';
    
    // Parse full address if individual components not provided
    if (!city && !state && callData.Address) {
      const addressParts = callData.Address.split(',');
      if (addressParts.length >= 2) {
        city = addressParts[1].trim();
      }
      
      if (addressParts.length >= 3) {
        // Try to extract state and zip
        const stateZip = addressParts[2].trim().split(' ');
        if (stateZip.length >= 1) {
          state = stateZip[0].trim();
        }
        
        if (stateZip.length >= 2) {
          zip = stateZip[1].trim();
        }
      }
    }
    
    // Extract or generate run number
    const runNumber = callExtraData.CallId || callData.CallId || '';
    
    // Extract ResponseModeToScene from Priority ID and Nature
    let responseModeToScene = DEFAULT_RESPONSE_MODE; // Use our centralized default from the utility
    
    // Pass both Priority ID and Nature to better determine response mode
    const callNature = callExtraData.Name || callExtraData.Nature || callData.Nature || '';
    
    if (callExtraData.Priority && callExtraData.Priority.Id) {
      // Use our centralized utility function for mapping with enhanced nature detection
      responseModeToScene = mapPriorityToEsoCode(callExtraData.Priority.Id, callNature);
      logger.info(`Mapped Resgrid Priority ID ${callExtraData.Priority.Id} and Nature "${callNature}" to ESO ResponseModeToScene ${responseModeToScene}`);
    } else {
      // If Priority is missing entirely, still check nature for keywords
      responseModeToScene = mapPriorityToEsoCode(null, callNature);
      logger.warn(`No Resgrid Priority ID found, using Nature-based or default ResponseModeToScene ${responseModeToScene}`);
    }
    
    // Prepare data for XML generation with additional fields according to ESO mapping
    const callDataForXml = {
      // Required fields
      CallId: callExtraData.CallId || callData.CallId,
      Timestamp: callExtraData.LoggedOn || callExtraData.LoggedOnUtc || callData.Timestamp || new Date().toISOString(),
      Nature: callExtraData.Name || callExtraData.Nature || callData.Nature || '',
      Address: callExtraData.FullAddress || callData.Address || '',
      UnitsCsv: unitsCsv,
      Notes: callExtraData.Note || callExtraData.Notes || callData.Notes || '',
      
      // Additional address components
      IncidentAddress1: addressLine1,
      IncidentAddress2: addressLine2,
      City: city,
      County: county,
      State: state,
      Zip: zip,
      DestinationName: callExtraData.DestinationName || '',
      
      // ESO mapped fields
      Priority: callData.Priority || (callExtraData.Priority ? callExtraData.Priority.Name : '') || '',  // Used for internal reference only
      RunNumber: runNumber,
      ResponseModeToScene: responseModeToScene, // ESO response mode mapped from Resgrid Priority.Id
      
      // Additional location information
      GeoLocation: `${callExtraData.Latitude || ''},${callExtraData.Longitude || ''}`,
      CrossStreet: callExtraData.CrossStreet || callData.CrossStreet || '',
      MapPage: callExtraData.MapPage || callData.MapPage || '',
      
      // Caller information
      ReportingParty: callExtraData.ReportingParty || callData.ReportingParty || '',
      ReportingPhone: callExtraData.ReportingPartyPhone || callData.ReportingPhone || '',
      
      // Call status
      CallStatus: callExtraData.CallState || callData.CallStatus || '',
      
      // Driver information
      Driver: callExtraData.Driver || callData.Driver || '',
      
      // Timestamps
      TransferOfPatientTime: callExtraData.TransferPatientTime || callData.TransferOfPatientTime || '',
      DispatchClosedTime: callExtraData.DispatchClosedTime || callData.DispatchClosedTime || '',
      UnitNotifiedTime: callExtraData.UnitNotifiedTime || callData.UnitNotifiedTime || '',
      UnitEnRouteTime: callExtraData.UnitEnRouteTime || callData.UnitEnRouteTime || '',
      UnitArrivedTime: callExtraData.UnitArrivedTime || callData.UnitArrivedTime || ''
    };
    
    // Generate XML using the improved XML generator
    const xmlData = generateXML(callDataForXml);
    
    // Create unique filename with timestamp to prevent collisions
    const timestamp = Date.now();
    const filename = `call_${callData.CallId}_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    // Save XML locally
    logger.info(`Saving XML to temporary file: ${localFilePath}`);
    fs.writeFileSync(localFilePath, xmlData);
    
    // Save a copy to the logs directory for archiving and debugging
    const logFilePath = path.join(logsDir, filename);
    logger.info(`Saving copy of XML to logs directory: ${logFilePath}`);
    fs.writeFileSync(logFilePath, xmlData);
    
    // Upload to ESO
    const remoteFilePath = path.join(config.sftp.remotePath, 'calls', filename);
    try {
      await uploadToSFTP(localFilePath, remoteFilePath);
      logger.info(`Successfully uploaded call ${callData.CallId} to ESO`);
      
      // Clean up temporary file
      fs.unlinkSync(localFilePath);
      logger.info(`Removed temporary file: ${localFilePath}`);
      
      // Log successful call data to Google Sheets
      try {
        logger.info(`Logging call ${callData.CallId} to Google Sheets with full field data`);
        await sheetCallRow(callDataForXml, callExtraData);
        logger.info(`Successfully logged call ${callData.CallId} to Google Sheets`);
      } catch (sheetError) {
        // Don't fail the entire process if Sheet logging fails
        logger.warn(`Failed to log call ${callData.CallId} to Google Sheets: ${sheetError.message}`);
      }
    } catch (error) {
      logger.error(`Failed to upload call ${callData.CallId} to ESO`, { error: error.message });
    }
  } catch (error) {
    logger.error(`Error processing call ${callData.CallId}`, { error: error.message });
  }
}

/**
 * Main function to initialize and run the service
 */
async function main() {
  try {
    logger.info('Starting Resgrid to ESO bridge service...');
    
    // Pre-load API token
    await getApiToken();
    
    logger.info('Connecting to Resgrid SignalR hub...');
    
    // Create SignalR connection
    const connection = new signalR.HubConnectionBuilder()
      .withUrl(config.resgrid.eventsUrl)
      .configureLogging(signalR.LogLevel.Information)
      .withAutomaticReconnect([0, 2000, 5000, 10000, 15000, 30000]) // Retry with increasing delays
      .build();
    
    // Handle connection events
    connection.onclose(async (error) => {
      if (error) {
        logger.error(`SignalR connection closed with error: ${error.message}`);
      } else {
        logger.info('SignalR connection closed');
      }
    });
    
    // Start the connection with retry logic
    let connectionRetries = 0;
    const maxConnectionRetries = 10;
    
    while (connectionRetries < maxConnectionRetries) {
      try {
        await connection.start();
        const connectionId = connection.connectionId;
        logger.info(`Connected to Resgrid SignalR hub. ConnectionId: ${connectionId}`);
        
        // Register callback for CallAdded events
        connection.on('CallAdded', (callData) => {
          processCallAdded(callData);
        });
        
        logger.info('Registered callback for CallAdded events');
        logger.info('Service started successfully');
        
        // Connection successful, break out of retry loop
        break;
      } catch (error) {
        connectionRetries++;
        logger.error(`Failed to connect to SignalR hub (attempt ${connectionRetries}): ${error.message}`);
        
        if (connectionRetries >= maxConnectionRetries) {
          logger.error(`Failed to connect after ${maxConnectionRetries} attempts, exiting...`);
          process.exit(1);
        }
        
        // Wait before retrying
        const delay = Math.min(1000 * Math.pow(2, connectionRetries), 30000); // Cap at 30 seconds
        logger.info(`Waiting ${delay}ms before retrying connection...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Graceful shutdown handlers
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT signal, shutting down...');
      await connection.stop();
      logger.info('Service stopped');
      process.exit(0);
    });
    
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM signal, shutting down...');
      await connection.stop();
      logger.info('Service stopped');
      process.exit(0);
    });
  } catch (error) {
    console.error(`Service initialization failed: ${error ? error.message : 'Unknown error'}`);
    process.exit(1);
  }
}

// Start the service
main();

/**
 * Create a simple HTTP health check server for Fly.io
 * This allows the Fly.io platform to verify our service is running
 * by listening on port 8080 (required for Fly.io deployments)
 */
const port = config.app.port;
const healthServer = http.createServer((req, res) => {
  // Log the request
  logger.info(`Health check request received: ${req.method} ${req.url}`);
  
  // Handle health check endpoint
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'OK',
      service: 'Resgrid-ESO Bridge',
      timestamp: new Date().toISOString(),
      version: '1.1.2'
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

// Start the health check server
healthServer.listen(port, '0.0.0.0', () => {
  logger.info(`Health check server listening on port ${port}`);
});