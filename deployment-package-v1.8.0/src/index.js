/**
 * Resgrid to ESO Bridge Application
 * 
 * This application listens for new calls from Resgrid via SignalR,
 * processes them, generates XML files according to ESO's format,
 * and uploads them via SFTP.
 */

// Validate environment before initializing anything else
const { validateAndExit } = require('./environment-validator');
validateAndExit();

const signalR = require('@microsoft/signalr');
const CloudSftpClient = require('./sftp-client');
const FlyIoSftpClient = require('./fly-io-sftp-client');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
// Use our fixed logger implementation
const logger = require('./fix-logger');
const { sheetCallRow, sheetLog } = require('./sheets-logger');
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
 * Generate fallback units when no units are assigned to a call
 */
function generateFallbackUnits(callData, callExtraData) {
  // Default fallback units based on call nature/type
  const callNature = (callExtraData?.Name || callData?.Name || '').toLowerCase();
  
  if (callNature.includes('medical') || callNature.includes('ems') || callNature.includes('ambulance')) {
    return 'EVTMED1';
  } else if (callNature.includes('fire') || callNature.includes('structure')) {
    return 'EVTENG1';
  } else if (callNature.includes('rescue') || callNature.includes('technical')) {
    return 'EVTRES1';
  } else {
    // Generic fallback
    return 'EVTMED1';
  }
}

/**
 * Uploads a file to ESO via SFTP
 */
async function uploadToSFTP(localFilePath, remoteFilePath) {
  const sftpConfig = {
    host: config.sftp.host,
    port: config.sftp.port,
    username: config.sftp.username,
    password: config.sftp.password
  };
  
  // Always use Fly.io optimized client to prevent handshake issues
  const sftpClient = new FlyIoSftpClient(sftpConfig);
  
  try {
    await sftpClient.connect();
    await sftpClient.uploadFile(localFilePath, remoteFilePath);
    await sftpClient.disconnect();
    return true;
  } catch (error) {
    logger.error(`SFTP upload failed: ${error.message}`);
    throw error;
  }
}

/**
 * Processes call data directly (used by polling with change detection already applied)
 */
async function processCallDirectly(callData, callExtraData) {
  try {
    logger.info(`[Call ${callId}] Processing call directly`);
    
    // Extract or generate units CSV list
    let unitsCsv = '';
    
    if (callExtraData?.Data?.Dispatches) {
      unitsCsv = callExtraData.Data.Dispatches.map(unit => unit.Name).join(',');
      logger.info(`Found ${callExtraData.Data.Dispatches.length} unit dispatches in Data.Dispatches`);
    }
    
    if (!unitsCsv) {
      // Use fallback unit assignment logic
      unitsCsv = generateFallbackUnits(callData, callExtraData);
      logger.info(`Using fallback units: ${unitsCsv}`);
    }
    
    // Generate XML for the call using original timestamps
    const xmlResult = await generateXML(callData, callExtraData, true);
    
    if (!xmlResult) {
      logger.error(`Failed to generate XML for Call ID: ${callData.CallId}`);
      return;
    }
    
    // Extract XML string from result object
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    // Create unique filename with timestamp to prevent collisions
    const timestamp = Date.now();
    const filename = `call_${callData.CallId}_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    // Save XML locally
    logger.info(`Saving XML to temporary file: ${localFilePath}`);
    fs.writeFileSync(localFilePath, xmlData);
    
    // Upload to ESO via SFTP
    const remoteFilePath = path.join(config.sftp.remotePath, filename);
    const uploadSuccess = await uploadToSFTP(localFilePath, remoteFilePath);
    
    if (uploadSuccess) {
      logger.info(`Successfully uploaded call ${callData.CallId} to ESO`);
      await sheetLog(`XML file uploaded to sftp.esosuite.net: ${filename} for Call ID: ${callData.CallId}`, 'info', `Call ID ${callData.CallId} - XML Upload Successful`, xmlData);
      
      // Clean up temporary file
      fs.unlinkSync(localFilePath);
      logger.info(`Removed temporary file: ${localFilePath}`);
    } else {
      logger.error(`Failed to upload call ${callData.CallId} to ESO`);
      await sheetLog(`Failed to upload XML file to sftp.esosuite.net: ${filename} for Call ID: ${callData.CallId}`, 'error', `Call ID ${callData.CallId} - Upload Failed`, xmlData);
    }
    
    // Log to Google Sheets with change detection
    logger.info(`Logging call ${callData.CallId} to Google Sheets with full field data`);
    
    // Use simple status values for Google Sheets display
    const uploadStatus = uploadSuccess ? 'Successful' : 'Failed';
    const uploadUrl = uploadSuccess ? `${config.sftp.host}${remoteFilePath}` : '';
    
    try {
      const result = await sheetCallRow(callData, callExtraData, uploadStatus, uploadUrl, xmlData);
      
      if (typeof result === 'object' && result !== null) {
        if (result.success) {
          logger.info(`✅ Successfully logged call ${callData.CallId} to Google Sheets`);
        } else {
          logger.warn(`❌ Google Sheets logging returned false for call ${callData.CallId}`);
        }
      } else if (result === true) {
        logger.info(`✅ Successfully logged call ${callData.CallId} to Google Sheets`);
      } else {
        logger.warn(`❌ Google Sheets logging returned false for call ${callData.CallId}`);
      }
    } catch (sheetError) {
      logger.error(`❌ Failed to log call ${callData.CallId} to Google Sheets: ${sheetError.message}`);
    }
    
  } catch (error) {
    logger.error(`Error processing call ${callData.CallId} directly: ${error.message}`);
  }
}

/**
 * Processes a new call from Resgrid
 */
// Store call data snapshots for change detection
let callDataSnapshots = new Map();

/**
 * Creates a snapshot of call data for change detection
 */
function createCallSnapshot(callData, callExtraData) {
  return {
    // Core call information
    callId: callData.CallId,
    name: callExtraData.Name || callData.Name,
    nature: callExtraData.Nature || callData.Nature,
    address: callExtraData.FullAddress || callData.Address,
    notes: callExtraData.Note || callExtraData.Notes || callData.Notes,
    
    // Call state and timing
    state: callExtraData.CallState || callData.CallStatus,
    loggedOn: callExtraData.LoggedOn || callExtraData.LoggedOnUtc || callData.Timestamp,
    closedOn: callExtraData.ClosedOn,
    
    // Priority and response information
    priorityId: callExtraData.Priority?.Id,
    priorityName: callExtraData.Priority?.Name,
    
    // Location details
    latitude: callExtraData.Latitude,
    longitude: callExtraData.Longitude,
    city: callExtraData.City,
    state: callExtraData.State,
    zip: callExtraData.ZipCode || callExtraData.Zip,
    
    // Unit assignments and their states
    dispatches: callExtraData.Dispatches ? JSON.stringify(callExtraData.Dispatches.map(d => ({
      id: d.Id,
      name: d.Name,
      type: d.Type,
      status: d.Status
    }))) : '',
    
    // Patient information
    patientName: callExtraData.PatientName,
    patientDOB: callExtraData.PatientDOB,
    
    // Contact information
    reportingParty: callExtraData.ReportingParty,
    reportingPartyPhone: callExtraData.ReportingPartyPhone,
    
    // Timestamps that might change during call progression
    unitNotifiedTime: callExtraData.UnitNotifiedTime,
    unitEnRouteTime: callExtraData.UnitEnRouteTime,
    unitArrivedTime: callExtraData.UnitArrivedTime,
    unitAtPatientTime: callExtraData.UnitAtPatientTime,
    unitClearedTime: callExtraData.UnitClearedTime,
    unitBackInServiceTime: callExtraData.UnitBackInServiceTime
  };
}

/**
 * Detects changes between two call snapshots
 */
function detectCallChanges(previousSnapshot, currentSnapshot) {
  const significantFields = [
    'name', 'nature', 'address', 'notes', 'state', 'closedOn',
    'priorityId', 'priorityName', 'latitude', 'longitude', 'city', 'state', 'zip',
    'dispatches', 'patientName', 'patientDOB', 'reportingParty', 'reportingPartyPhone',
    'unitNotifiedTime', 'unitEnRouteTime', 'unitArrivedTime', 'unitAtPatientTime',
    'unitClearedTime', 'unitBackInServiceTime'
  ];
  
  for (const field of significantFields) {
    const prevValue = previousSnapshot[field] || '';
    const currValue = currentSnapshot[field] || '';
    
    if (prevValue !== currValue) {
      logger.info(`Change detected in field '${field}': "${prevValue}" -> "${currValue}"`);
      return true;
    }
  }
  
  return false;
}

async function processCallAdded(callData) {
  try {
    const callId = callData.CallId;
    logger.info(`[Call ${callId}] Received CallAdded event`);
    
    // Check for duplicates - skip if already processed
    if (processedCallIds.has(callData.CallId)) {
      logger.info(`Call ID ${callData.CallId} already processed, skipping duplicate`);
      return;
    }
    
    // Fetch additional data for the call to check for changes
    logger.info(`[Call ${callId}] Fetching extra data`);
    
    const callExtraData = await getCallExtraData(callData.CallId);
    if (!callExtraData) {
      logger.error(`[Call ${callId}] Failed to fetch extra data`);
      return;
    }
    
    // Create a snapshot of the current call data for change detection
    const currentSnapshot = createCallSnapshot(callData, callExtraData);
    
    // Check if this call has changed since last processing
    const previousSnapshot = callDataSnapshots.get(callData.CallId);
    
    if (previousSnapshot) {
      const hasChanges = detectCallChanges(previousSnapshot, currentSnapshot);
      
      if (!hasChanges) {
        logger.info(`[Call ${callId}] No changes detected - skipping processing`);
        return;
      }
      
      logger.info(`[Call ${callId}] Changes detected - proceeding with processing`);
    } else {
      logger.info(`[Call ${callId}] First time processing - proceeding with processing`);
    }
    
    // Store the current snapshot for future change detection
    callDataSnapshots.set(callData.CallId, currentSnapshot);
    
    // Mark as processed to prevent duplicate processing
    processedCallIds.add(callData.CallId);
    
    // Process the call using the streamlined function (change detection already applied)
    await processCallDirectly(callData, callExtraData);
    
  } catch (error) {
    logger.error(`Error in processCallAdded for Call ID: ${callData.CallId}: ${error.message}`);
  }
}

// Legacy processing code removed - all processing now uses streamlined processCallDirectly function

/**
 * Poll for recent calls as a backup to SignalR
 * This ensures we don't miss any calls if SignalR events aren't received
 */
const axios = require('axios'); // Make sure axios is available
const POLL_INTERVAL = 60 * 1000; // Poll every 60 seconds
const LOOKBACK_WINDOW = 10 * 60 * 1000; // Look for calls in the last 10 minutes
let lastPollTime = new Date(Date.now() - LOOKBACK_WINDOW); // Initialize with lookback window
let processedCallIds = new Set(); // Keep track of processed calls to avoid duplicates

/**
 * Poll for recent calls and process any that are new
 */
async function pollForRecentCalls() {
  try {
    logger.info('Polling for recent calls (backup mechanism)...');
    
    const token = await getApiToken();
    if (!token) {
      logger.error('Failed to get API token for polling, will retry next cycle');
      return;
    }
    
    // Try to get active calls
    try {
      logger.info('Fetching active calls via GetActiveCalls endpoint...');
      
      const response = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.Data) {
        const calls = response.data.Data;
        logger.info(`Found ${calls.length} active calls during polling`);
        
        // Process each call with change detection
        let processedCallCount = 0;
        
        for (const call of calls) {
          logger.info(`Checking call ${call.CallId} during polling: ${call.Name || 'Unnamed call'}`);
          
          // Fetch extra data to enable change detection
          const callExtraData = await getCallExtraData(call.CallId);
          if (!callExtraData) {
            logger.warn(`Failed to fetch extra data for Call ID: ${call.CallId} during polling`);
            continue;
          }
          
          // Create snapshot and check for changes
          const currentSnapshot = createCallSnapshot(call, callExtraData);
          const previousSnapshot = callDataSnapshots.get(call.CallId);
          
          if (previousSnapshot) {
            const hasChanges = detectCallChanges(previousSnapshot, currentSnapshot);
            
            if (!hasChanges) {
              logger.info(`[Call ${callId}] No changes detected - skipping processing during polling`);
              continue;
            }
            
            logger.info(`Changes detected for call ${call.CallId} during polling - proceeding with processing`);
          } else {
            logger.info(`First time processing call ${call.CallId} during polling - proceeding with processing`);
          }
          
          // Store the current snapshot
          callDataSnapshots.set(call.CallId, currentSnapshot);
          
          // Mark as processed to prevent duplicate processing
          processedCallIds.add(call.CallId);
          
          // Process the call (skip the duplicate check and change detection since we already did it)
          await processCallDirectly(call, callExtraData);
          processedCallCount++;
        }
        
        logger.info(`Processed ${processedCallCount} calls with changes during polling cycle`);
      }
    } catch (error) {
      logger.warn(`Error polling for active calls: ${error.message}`);
    }
    
    // Update last poll time
    lastPollTime = new Date();
    
    // Clean up old call snapshots to prevent memory growth (keep last 24 hours)
    if (callDataSnapshots.size > 500) {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
      for (const [callId, snapshot] of callDataSnapshots.entries()) {
        const callTime = new Date(snapshot.loggedOn || 0).getTime();
        if (callTime < cutoffTime) {
          callDataSnapshots.delete(callId);
        }
      }
      logger.info(`Cleaned up call snapshots cache: ${callDataSnapshots.size} snapshots remaining`);
    }
    
    // Schedule next poll
    setTimeout(pollForRecentCalls, POLL_INTERVAL);
  } catch (error) {
    logger.error(`Error during call polling: ${error.message}`);
    // Ensure polling continues even after errors
    setTimeout(pollForRecentCalls, POLL_INTERVAL);
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
    
    // Start the polling mechanism as a backup to SignalR
    setTimeout(pollForRecentCalls, 10000); // Start polling after 10 seconds
    logger.info(`Call polling backup mechanism initialized (every ${POLL_INTERVAL/1000} seconds)`);
    
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
        
        // Register callback for CallAdded events with enhanced logging
        connection.on('CallAdded', (callData) => {
          logger.info(`⚠️ RECEIVED CALL EVENT: CallAdded with data: ${JSON.stringify(callData)}`);
          // Log to console for visibility in case logger fails
          console.log(`⚠️ RECEIVED CALL EVENT: CallAdded for call ID: ${callData?.CallId || 'unknown'}`);
          processCallAdded(callData);
        });
        
        // Register additional SignalR events for debugging
        connection.on('CallStateChanged', (callData) => {
          logger.info(`⚠️ RECEIVED CALL EVENT: CallStateChanged for call ID: ${callData?.CallId || 'unknown'}`);
        });
        
        connection.on('CallDispatched', (callData) => {
          logger.info(`⚠️ RECEIVED CALL EVENT: CallDispatched for call ID: ${callData?.CallId || 'unknown'}`);
        });
        
        logger.info('Registered callback for CallAdded and other events');
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