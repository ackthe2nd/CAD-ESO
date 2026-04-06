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
const XMLIntegrityMonitor = require('./xml-integrity-monitor');

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

// Initialize XML Integrity Monitor
const xmlIntegrityMonitor = new XMLIntegrityMonitor();

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
    const callId = callData.CallId;
    logger.info(`[Call ${callId}] Processing call directly`);
    
    // Extract or generate units CSV list
    let unitsCsv = '';
    
    if (callExtraData?.Data?.Dispatches) {
      unitsCsv = callExtraData.Data.Dispatches.map(unit => unit.Name).join(',');
      logger.info(`[Call ${callId}] Found ${callExtraData.Data.Dispatches.length} unit dispatches in Data.Dispatches`);
    }
    
    if (!unitsCsv) {
      // Use fallback unit assignment logic
      unitsCsv = generateFallbackUnits(callData, callExtraData);
      logger.info(`[Call ${callId}] Using fallback units: ${unitsCsv}`);
    }
    
    // Generate XML for the call using original timestamps
    const xmlResult = await generateXML(callData, callExtraData, true);
    
    if (!xmlResult) {
      logger.error(`[Call ${callId}] Failed to generate XML`);
      return;
    }
    
    // Extract XML string from result object
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    // Create unique filename with timestamp to prevent collisions
    const timestamp = Date.now();
    const filename = `call_${callData.CallId}_${timestamp}.xml`;
    const localFilePath = path.join(tempDir, filename);
    
    // Save XML locally
    logger.info(`[Call ${callId}] Saving XML to temporary file: ${localFilePath}`);
    fs.writeFileSync(localFilePath, xmlData);
    
    // Upload to ESO via SFTP with detailed status tracking
    const remoteFilePath = path.join(config.sftp.remotePath, filename);
    let uploadStatus = 'Failed';
    let uploadNotes = '';
    let uploadUrl = '';
    
    try {
      const uploadSuccess = await uploadToSFTP(localFilePath, remoteFilePath);
      
      if (uploadSuccess) {
        uploadStatus = 'Success';
        uploadUrl = `sftp.esosuite.net${remoteFilePath}`;
        uploadNotes = `Successfully uploaded to ESO SFTP server at ${new Date().toISOString()}. File: ${filename}, Size: ${xmlData.length} bytes, Destination: ${config.sftp.remotePath}`;
        
        logger.info(`[Call ${callId}] Successfully uploaded to ESO`);
        
        // Determine if this is a closure upload
        const isClosureUpload = callData.State == 1 && xmlData.includes('<UnitCleared>') && xmlData.includes('<UnitBackInService>');
        const uploadMessage = isClosureUpload 
          ? `Final closure XML uploaded to sftp.esosuite.net: ${filename} for Call ID: ${callData.CallId} - Call lifecycle complete`
          : `XML file uploaded to sftp.esosuite.net: ${filename} for Call ID: ${callData.CallId}`;
        const uploadStatusMessage = isClosureUpload 
          ? `Call ID ${callData.CallId} - Final Closure Upload`
          : `Call ID ${callData.CallId} - XML Upload Successful`;
        
        await sheetLog(uploadMessage, 'info', uploadStatusMessage, xmlData);
        
        // Verify XML integrity after successful upload
        const integrityResult = await xmlIntegrityMonitor.verifyCallIntegrity(callData.CallId, xmlData, new Date().toISOString(), filename);
        if (integrityResult.verified) {
          logger.info(`[Call ${callId}] ✓ XML integrity verified`);
        } else {
          logger.warn(`[Call ${callId}] ⚠ XML integrity check failed: ${integrityResult.reason}`);
        }
        
        // Clean up temporary file
        fs.unlinkSync(localFilePath);
        logger.info(`[Call ${callId}] Removed temporary file: ${localFilePath}`);
      } else {
        uploadStatus = 'Failed';
        uploadNotes = `Upload failed for unknown reason at ${new Date().toISOString()}. File: ${filename}, Attempted destination: ${remoteFilePath}`;
        
        logger.error(`[Call ${callId}] Failed to upload to ESO`);
        await sheetLog(`Failed to upload XML file to sftp.esosuite.net: ${filename} for Call ID: ${callData.CallId}`, 'error', `Call ID ${callData.CallId} - Upload Failed`, xmlData);
      }
    } catch (uploadError) {
      uploadStatus = 'Fail';
      uploadNotes = `Upload failed with error at ${new Date().toISOString()}: ${uploadError.message}. File: ${filename}, Attempted destination: ${remoteFilePath}`;
      
      logger.error(`[Call ${callId}] Failed to upload to ESO: ${uploadError.message}`);
      await sheetLog(`Failed to upload XML file to sftp.esosuite.net: ${filename} for Call ID: ${callData.CallId} - Error: ${uploadError.message}`, 'error', `Call ID ${callData.CallId} - Upload Failed`, xmlData);
    }
    
    // Log to Google Sheets with detailed upload status
    logger.info(`[Call ${callId}] Logging to Google Sheets with full field data`);
    
    try {
      // Pass correct parameters: callData, extraData, uploadStatus, uploadUrl, actualXML
      const result = await sheetCallRow(callData, callExtraData, uploadStatus, uploadUrl, xmlData);
      
      if (typeof result === 'object' && result !== null) {
        if (result.success) {
          logger.info(`[Call ${callId}] ✅ Successfully logged to Google Sheets`);
        } else {
          logger.warn(`[Call ${callId}] ❌ Google Sheets logging returned false`);
        }
      } else if (result === true) {
        logger.info(`[Call ${callId}] ✅ Successfully logged to Google Sheets`);
      } else {
        logger.warn(`[Call ${callId}] ❌ Google Sheets logging returned false`);
      }
    } catch (sheetError) {
      logger.error(`[Call ${callId}] ❌ Failed to log to Google Sheets: ${sheetError.message}`);
    }
    
  } catch (error) {
    logger.error(`[Call ${callId}] Error processing call directly: ${error.message}`);
  }
}

/**
 * Processes a new call from Resgrid
 */
// Store call data snapshots for change detection
let callDataSnapshots = new Map();

/**
 * Creates a snapshot of call data for change detection
 * Enhanced to capture all fields that affect XML generation
 */
function createCallSnapshot(callData, callExtraData) {
  const data = callExtraData?.Data || {};
  
  return {
    // Core call information
    callId: callData.CallId,
    name: callData.Name,
    nature: callData.Nature,
    note: callData.Note,
    address: callData.Address,
    geolocation: callData.Geolocation,
    
    // Call state and timing - critical for XML and closure detection
    state: callData.State,
    stateText: callData.State === 0 ? 'Active' : callData.State === 1 ? 'Closed' : `Unknown(${callData.State})`,
    loggedOn: callData.LoggedOn,
    loggedOnUtc: callData.LoggedOnUtc,
    dispatchedOn: callData.DispatchedOn,
    dispatchedOnUtc: callData.DispatchedOnUtc,
    closedOn: callData.ClosedOn || callData.CallClosedTime || callData.EndTime || callData.CompletedOn,
    
    // Priority information
    priority: callData.Priority,
    
    // Location details that affect XML coordinates
    latitude: callData.Latitude,
    longitude: callData.Longitude,
    
    // Contact and reference information
    contactName: callData.ContactName,
    contactInfo: callData.ContactInfo,
    referenceId: callData.ReferenceId,
    externalId: callData.ExternalId,
    incidentId: callData.IncidentId,
    
    // Unit dispatches - critical for XML unit sections
    dispatches: data.Dispatches ? JSON.stringify(data.Dispatches.map(d => ({
      id: d.Id,
      name: d.Name,
      type: d.Type,
      status: d.Status,
      location: d.Location,
      userId: d.UserId,
      dispatchTime: d.DispatchTime,
      enRouteTime: d.EnRouteTime,
      arrivedTime: d.ArrivedTime,
      clearedTime: d.ClearedTime,
      backInServiceTime: d.BackInServiceTime,
      atPatientTime: d.AtPatientTime,
      transportTime: d.TransportTime,
      atHospitalTime: d.AtHospitalTime
    })).sort((a, b) => a.name.localeCompare(b.name))) : '[]',
    
    // Simplified unit list for easy comparison
    unitNames: data.Dispatches ? data.Dispatches.map(d => d.Name).sort().join(',') : '',
    unitCount: data.Dispatches ? data.Dispatches.length : 0,
    
    // Unit activities - tracks status changes that affect XML
    activities: data.Activity ? JSON.stringify(data.Activity.map(a => ({
      id: a.Id,
      unitId: a.UnitId,
      unitName: a.UnitName,
      type: a.Type,
      status: a.Status,
      timestamp: a.Timestamp,
      note: a.Note
    })).sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))) : '[]',
    
    // Extract all unit timing information for granular change detection
    unitTimings: data.Dispatches ? JSON.stringify(data.Dispatches.reduce((timings, unit) => {
      timings[unit.Name] = {
        dispatch: unit.DispatchTime || '',
        enRoute: unit.EnRouteTime || '',
        arrived: unit.ArrivedTime || '',
        atPatient: unit.AtPatientTime || '',
        transport: unit.TransportTime || '',
        atHospital: unit.AtHospitalTime || '',
        cleared: unit.ClearedTime || '',
        backInService: unit.BackInServiceTime || ''
      };
      return timings;
    }, {})) : '{}',
    
    // Address components for change detection
    fullAddress: callData.Address || '',
    addressComponents: (() => {
      const addr = callData.Address || '';
      const parts = addr.split(',').map(p => p.trim());
      return JSON.stringify({
        street: parts[0] || '',
        city: parts[1] || '',
        state: parts[2] || '',
        zip: parts[3] || '',
        full: addr
      });
    })(),
    
    // Protocol and call type information
    protocols: callData.Protocols ? JSON.stringify(callData.Protocols) : '',
    type: callData.Type,
    
    // Additional timestamps that might be added later
    audioFileId: callData.AudioFileId,
    notesCount: callData.NotesCount,
    audioCount: callData.AudioCount,
    imagesCount: callData.ImgagesCount,
    fileCount: callData.FileCount,
    
    // What3Words location if available
    what3Words: callData.What3Words,
    
    // Patient information if available in extra data
    patientInfo: data.PatientInfo ? JSON.stringify(data.PatientInfo) : '',
    
    // Narrative and additional notes that might change
    narrative: data.Narrative || '',
    additionalNotes: data.AdditionalNotes || '',
    
    // Create a stable hash of the call data structure excluding volatile metadata
    extraDataHash: callExtraData ? (() => {
      // Create a copy excluding volatile fields that change on every API call
      const stableData = { ...callExtraData };
      
      // Remove volatile metadata fields that change with each API request
      delete stableData.Timestamp;
      delete stableData.RequestId;
      delete stableData.Version;
      delete stableData.Node;
      delete stableData.Environment;
      delete stableData.PreviousPageUrl;
      delete stableData.NextPageUrl;
      delete stableData.PageSize;
      delete stableData.Page;
      delete stableData.Status;
      
      // Create hash from stable data only
      return JSON.stringify(stableData).replace(/\s/g, '');
    })() : ''
  };
}

/**
 * Detects changes between two call snapshots
 * Enhanced to capture all XML-affecting changes
 */
function detectCallChanges(previousSnapshot, currentSnapshot) {
  // All fields that can affect XML output - prioritizing units, times, and addresses
  const xmlAffectingFields = [
    // CRITICAL FIELDS - Units, Times, Address (highest priority)
    'unitNames', 'unitCount', 'unitTimings', 'fullAddress', 'addressComponents', 'geolocation',
    
    // Core call information
    'name', 'nature', 'note',
    
    // Call state and timing
    'state', 'loggedOn', 'loggedOnUtc', 'dispatchedOn', 'dispatchedOnUtc', 'closedOn',
    
    // Priority and classification
    'priority', 'type', 'protocols',
    
    // Location details
    'latitude', 'longitude',
    
    // Contact and reference information
    'contactName', 'contactInfo', 'referenceId', 'externalId', 'incidentId',
    
    // Detailed unit information - critical for XML
    'dispatches', 'activities',
    
    // Additional metadata
    'audioFileId', 'notesCount', 'audioCount', 'imagesCount', 'fileCount',
    'what3Words', 'patientInfo', 'narrative', 'additionalNotes',
    
    // Catch-all for any other changes
    'extraDataHash'
  ];
  
  const changes = [];
  
  for (const field of xmlAffectingFields) {
    const prevValue = previousSnapshot[field] || '';
    const currValue = currentSnapshot[field] || '';
    
    if (prevValue !== currValue) {
      // Special handling for critical XML fields
      if (field === 'unitNames') {
        changes.push(`Units assigned: "${prevValue}" -> "${currValue}"`);
        logger.info(`🚨 CRITICAL CHANGE - Units assigned: "${prevValue}" -> "${currValue}"`);
      } else if (field === 'unitCount') {
        changes.push(`Unit count: ${prevValue} -> ${currValue}`);
        logger.info(`🚨 CRITICAL CHANGE - Unit count: ${prevValue} -> ${currValue}`);
      } else if (field === 'unitTimings') {
        changes.push(`Unit timings changed`);
        logger.info(`🚨 CRITICAL CHANGE - Unit timings updated (will regenerate XML)`);
      } else if (field === 'fullAddress' || field === 'addressComponents') {
        changes.push(`Address: "${prevValue}" -> "${currValue}"`);
        logger.info(`🚨 CRITICAL CHANGE - Address modified: "${prevValue}" -> "${currValue}"`);
      } else if (field === 'geolocation') {
        changes.push(`Location coordinates: "${prevValue}" -> "${currValue}"`);
        logger.info(`🚨 CRITICAL CHANGE - GPS coordinates: "${prevValue}" -> "${currValue}"`);
      } else if (field === 'state') {
        const prevState = previousSnapshot.stateText || `State(${prevValue})`;
        const currState = currentSnapshot.stateText || `State(${currValue})`;
        changes.push(`Call state: ${prevState} -> ${currState}`);
        logger.info(`🔥 CALL STATE CHANGE - ${prevState} -> ${currState} for call ${currentSnapshot.callId}`);
        
        // Detect closure transition and capture timestamp
        if (prevValue == 0 && currValue == 1) {
          const closureTime = new Date().toISOString();
          logger.info(`📋 CALL CLOSURE DETECTED - Call ${currentSnapshot.callId} transitioned from Active to Closed at ${closureTime}`);
          currentSnapshot.closureDetectedAt = closureTime;
          
          // Log closure completion to Google Sheets
          const pacificTime = new Date().toLocaleString('en-US', {
            timeZone: 'America/Los_Angeles',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          }).replace(/(\d+)\/(\d+)\/(\d+),?\s*(\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
          
          // Create closure completion log entry
          sheetLog(
            `Call ${currentSnapshot.callId} closure process completed - Final XML will be generated with closure timestamps`,
            'info',
            `Call ID ${currentSnapshot.callId} - Closure Complete`,
            ''
          ).catch(error => {
            logger.warn(`Failed to log closure completion: ${error.message}`);
          });
        }
      } else if (field === 'dispatches' || field === 'activities' || field === 'extraDataHash') {
        const prevLength = prevValue.length;
        const currLength = currValue.length;
        changes.push(`${field} changed (${prevLength} -> ${currLength} chars)`);
        logger.info(`Change detected in field '${field}': content length ${prevLength} -> ${currLength}`);
      } else {
        changes.push(`${field}: "${prevValue}" -> "${currValue}"`);
        logger.info(`Change detected in field '${field}': "${prevValue}" -> "${currValue}"`);
      }
    }
  }
  
  if (changes.length > 0) {
    logger.info(`Total changes detected: ${changes.length} fields changed`);
    
    // Log first few changes for debugging
    const maxLogChanges = 3;
    for (let i = 0; i < Math.min(changes.length, maxLogChanges); i++) {
      logger.info(`  Change ${i + 1}: ${changes[i]}`);
    }
    
    if (changes.length > maxLogChanges) {
      logger.info(`  ... and ${changes.length - maxLogChanges} more changes`);
    }
    
    return true;
  }
  
  logger.debug('No significant changes detected');
  return false;
}

async function processCallAdded(callData) {
  try {
    const callId = callData.CallId;
    logger.info(`[Call ${callId}] Received CallAdded event`);
    
    // Check for duplicates - skip if already processed
    if (processedCallIds.has(callData.CallId)) {
      logger.info(`[Call ${callId}] Already processed, skipping duplicate`);
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
    logger.error(`[Call ${callId}] Error in processCallAdded: ${error.message}`);
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
let activeCallIds = new Set(); // Track currently active call IDs for closure detection

/**
 * Detects calls that were previously active but are no longer in the active list
 * Updates their Call Closed Time in Google Sheets
 */
async function detectClosedCalls(currentActiveCallIds) {
  try {
    const previouslyActiveCallIds = Array.from(activeCallIds);
    const closedCallIds = previouslyActiveCallIds.filter(callId => !currentActiveCallIds.has(callId));
    
    if (closedCallIds.length > 0) {
      logger.info(`Detected ${closedCallIds.length} closed calls: ${closedCallIds.join(', ')}`);
      
      for (const callId of closedCallIds) {
        await updateCallClosedTime(callId);
      }
    }
  } catch (error) {
    logger.error(`Error detecting closed calls: ${error.message}`);
  }
}

/**
 * Updates the Call Closed Time for a specific call and generates final XML with closure information
 */
async function updateCallClosedTime(callId) {
  try {
    const currentTime = new Date().toISOString().replace('Z', ''); // Pacific Time format
    logger.info(`Processing call closure for call ${callId} - generating final XML with closure data`);
    
    // Fetch the most recent call data to ensure we have all final information
    const token = await getApiToken();
    if (!token) {
      logger.error(`Failed to get API token for call closure processing of ${callId}`);
      return;
    }
    
    // Get the most up-to-date call data including any final status changes
    let finalCallData = null;
    let finalExtraData = null;
    
    try {
      // Try to get final call data from recent calls endpoint
      const recentCallsResponse = await axios({
        method: 'GET',
        url: `https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (recentCallsResponse.data && recentCallsResponse.data.Data) {
        finalCallData = recentCallsResponse.data.Data;
        logger.info(`Retrieved final call data for closed call ${callId}`);
      }
    } catch (error) {
      logger.warn(`Could not fetch final call data for ${callId}: ${error.message}`);
    }
    
    // Get final extra data including any closure activities
    finalExtraData = await getCallExtraData(callId);
    
    if (!finalCallData && !finalExtraData) {
      logger.warn(`No final data available for closed call ${callId}, using minimal closure data`);
      
      // Create minimal closure data
      finalCallData = {
        CallId: callId,
        State: 'Closed',
        ClosedOn: currentTime
      };
      
      finalExtraData = {
        Data: {
          ClosedOn: currentTime,
          Dispatches: [],
          Activity: []
        }
      };
    } else {
      // Update the existing data with closure information
      if (finalCallData) {
        finalCallData.State = 'Closed';
        finalCallData.ClosedOn = currentTime;
      }
      
      if (finalExtraData && finalExtraData.Data) {
        finalExtraData.Data.ClosedOn = currentTime;
      }
    }
    
    logger.info(`Generating final XML for closed call ${callId} with complete closure data`);
    
    // Generate final XML with all closure information
    const { generateXML } = require('./xml-generator');
    const xmlResult = await generateXML(finalCallData, finalExtraData, true);
    const finalXml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    // Upload final XML to ESO with closure information
    if (finalXml && finalXml.length > 100) {
      try {
        const timestamp = Date.now();
        const tempFilePath = `/tmp/resgrid-eso-transfer/call_${callId}_final_${timestamp}.xml`;
        const remoteFilePath = `${config.sftp.directory}/call_${callId}_final_${timestamp}.xml`;
        
        // Save final XML to temporary file
        const fs = require('fs');
        fs.writeFileSync(tempFilePath, finalXml);
        logger.info(`Saved final XML for closed call ${callId} to: ${tempFilePath}`);
        
        // Upload final XML to ESO
        await uploadToSFTP(tempFilePath, remoteFilePath);
        logger.info(`✅ Successfully uploaded final XML for closed call ${callId} to ESO`);
        
        // Log the final upload
        const { sheetLog } = require('./src/sheets-logger');
        await sheetLog('info', `Final XML uploaded for closed call ${callId}`, `Call ID ${callId} - Final XML Upload Successful`, finalXml);
        
        // Clean up temporary file
        fs.unlinkSync(tempFilePath);
        logger.info(`Removed temporary final XML file: ${tempFilePath}`);
        
      } catch (uploadError) {
        logger.error(`Failed to upload final XML for closed call ${callId}: ${uploadError.message}`);
        const { sheetLog } = require('./src/sheets-logger');
        await sheetLog('error', `Failed to upload final XML for closed call ${callId}`, `Call ID ${callId} - Final XML Upload Failed`, finalXml || '');
      }
    }
    
    // Update Google Sheets with final closure data
    const { logCallDataToSheets } = require('./src/sheets-logger');
    await logCallDataToSheets(finalCallData, finalExtraData, finalXml, 'Call Closed - Final Update');
    
    logger.info(`✅ Successfully processed call closure for call ${callId} with final XML upload`);
    
  } catch (error) {
    logger.error(`Error processing call closure for call ${callId}: ${error.message}`);
  }
}

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
        const currentActiveCallIds = new Set();
        
        for (const call of calls) {
          currentActiveCallIds.add(call.CallId);
          logger.info(`[Call ${call.CallId}] Checking during polling: ${call.Name || 'Unnamed call'}`);
          
          // Fetch extra data to enable change detection
          const callExtraData = await getCallExtraData(call.CallId);
          if (!callExtraData) {
            logger.warn(`[Call ${call.CallId}] Failed to fetch extra data during polling`);
            continue;
          }
          
          // Create snapshot and check for changes
          const currentSnapshot = createCallSnapshot(call, callExtraData);
          const previousSnapshot = callDataSnapshots.get(call.CallId);
          
          if (previousSnapshot) {
            const hasChanges = detectCallChanges(previousSnapshot, currentSnapshot);
            
            if (!hasChanges) {
              logger.info(`[Call ${call.CallId}] No changes detected - skipping processing during polling`);
              continue;
            }
            
            logger.info(`[Call ${call.CallId}] Changes detected during polling - proceeding with processing`);
          } else {
            logger.info(`[Call ${call.CallId}] First time processing during polling - proceeding with processing`);
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
        
        // Check for calls that were previously active but are no longer in the active list (call closure detection)
        await detectClosedCalls(currentActiveCallIds);
        
        // Update the global active call IDs tracker
        activeCallIds = currentActiveCallIds;
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
 * Create HTTP server with Express for health check and test endpoints
 * This allows the Fly.io platform to verify our service is running
 * and provides test functionality for call testing
 */
const express = require('express');
const testEndpoint = require('./test-endpoint');

const app = express();
const port = config.app.port;

// Middleware
app.use(express.json());

// Health check endpoint
app.get(['/', '/health'], (req, res) => {
  logger.info(`Health check request received: ${req.method} ${req.url}`);
  res.json({
    status: 'OK',
    service: 'Resgrid-ESO Bridge',
    timestamp: new Date().toISOString(),
    version: '1.1.2'
  });
});

// Test endpoint for call testing
app.get('/test/:callId', async (req, res) => {
  const { callId } = req.params;
  
  try {
    logger.info(`[Call ${callId}] Starting test`);
    
    // Import required modules
    const { generateXML } = require('./xml-generator');
    const { sheetCallRow } = require('./sheets-logger');
    const { getCallExtraData } = require('./resgrid-api');
    const { getApiToken } = require('./token-manager');
    const axios = require('axios');
    
    // Update test result function
    const updateTestResult = async (status, details = '') => {
      try {
        const { google } = require('googleapis');
        const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
        const credentials = JSON.parse(serviceAccountJson);
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        const sheetsClient = google.sheets({ version: 'v4', auth });
        const spreadsheetId = process.env.LOG_SHEET_ID;

        // Find the call row
        const dataResponse = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: 'Call Data!B:AK',
        });

        const data = dataResponse.data.values || [];
        let targetRow = -1;

        for (let i = 1; i < data.length; i++) {
          if (data[i] && data[i][0] === callId) {
            targetRow = i + 1;
            break;
          }
        }

        if (targetRow === -1) {
          logger.warn(`Call ${callId} not found in sheets for test result update`);
          return false;
        }

        // Format result with timestamp
        const timestamp = new Date().toLocaleTimeString('en-US', { 
          timeZone: 'America/Los_Angeles',
          hour12: false 
        });
        
        let resultText;
        switch (status) {
          case 'initializing':
            resultText = `🔄 INITIALIZING... (${timestamp})`;
            break;
          case 'authenticating':
            resultText = `🔐 AUTHENTICATING... (${timestamp})`;
            break;
          case 'fetching':
            resultText = `📡 FETCHING DATA... (${timestamp})`;
            break;
          case 'processing':
            resultText = `⚙️ PROCESSING... (${timestamp})`;
            break;
          case 'generating':
            resultText = `🔧 GENERATING XML... (${timestamp})`;
            break;
          case 'validating':
            resultText = `✔️ VALIDATING... (${timestamp})`;
            break;
          case 'updating':
            resultText = `💾 UPDATING SHEETS... (${timestamp})`;
            break;
          case 'success':
            resultText = `✅ SUCCESS (${timestamp})`;
            break;
          case 'failed':
            resultText = `❌ FAILED: ${details} (${timestamp})`;
            break;
          default:
            resultText = `🔄 ${status.toUpperCase()}... (${timestamp})`;
        }

        // Find Test Result column dynamically
        const headersResponse = await sheetsClient.spreadsheets.values.get({
          spreadsheetId,
          range: 'Call Data!A1:AZ1',
        });
        
        const headers = headersResponse.data.values[0] || [];
        let testResultIndex = -1;
        
        headers.forEach((header, index) => {
          if (header === 'Test Result') testResultIndex = index;
        });
        
        if (testResultIndex >= 0) {
          // Convert index to proper Excel column letter (A, B, ..., Z, AA, AB, etc.)
          function indexToColumnLetter(index) {
            let result = '';
            while (index >= 0) {
              result = String.fromCharCode(65 + (index % 26)) + result;
              index = Math.floor(index / 26) - 1;
            }
            return result;
          }
          
          const testResultColumn = indexToColumnLetter(testResultIndex);
          await sheetsClient.spreadsheets.values.update({
            spreadsheetId,
            range: `Call Data!${testResultColumn}${targetRow}`,
            valueInputOption: 'USER_ENTERED',
            resource: {
              values: [[resultText]],
            },
          });
        }

        return true;
      } catch (error) {
        logger.error(`Failed to update test result: ${error.message}`);
        return false;
      }
    };
    
    // Step 1: Initialize test
    await updateTestResult('initializing');
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 2: Authenticate with Resgrid
    await updateTestResult('authenticating');
    const token = await getApiToken();
    if (!token) {
      await updateTestResult('failed', 'Failed to get Resgrid API token');
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to get Resgrid API token',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Fetch call data from Resgrid
    await updateTestResult('fetching');
    let callData = null;
    
    try {
      const activeCallsResponse = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (activeCallsResponse.data?.Data) {
        callData = activeCallsResponse.data.Data.find(c => c.CallId.toString() === callId.toString());
      }
      
      if (!callData) {
        const callResponse = await axios({
          method: 'GET',
          url: `https://api.resgrid.com/api/v4/Calls/GetCall`,
          params: { callId },
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        callData = callResponse.data?.Data;
      }
    } catch (fetchError) {
      logger.error(`Error fetching call data: ${fetchError.message}`);
    }
    
    if (!callData) {
      await updateTestResult('failed', 'Call not found in Resgrid');
      return res.status(404).json({ 
        success: false, 
        error: 'Call not found in Resgrid',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 4: Fetch extra call data
    await updateTestResult('processing');
    const extraData = await getCallExtraData(callId);
    if (!extraData) {
      await updateTestResult('failed', 'Failed to fetch call extra data');
      return res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch call extra data',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 5: Generate XML
    await updateTestResult('generating');
    const xmlResult = await generateXML(callData, extraData);
    const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    if (!xml || xml.length === 0) {
      await updateTestResult('failed', 'XML generation failed');
      return res.status(500).json({ 
        success: false, 
        error: 'XML generation failed',
        callId 
      });
    }
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 6: Validate XML structure
    await updateTestResult('validating');
    const hasRequiredFields = xml.includes('<IncidentNumber>') && 
                             xml.includes('<IncidentOrOnset>') &&
                             xml.includes('<DispatchNotified>');
    
    if (!hasRequiredFields) {
      await updateTestResult('failed', 'XML missing required fields');
      return res.status(500).json({ 
        success: false, 
        error: 'Generated XML missing required fields',
        callId,
        xml: xml.substring(0, 500) + '...'
      });
    }
    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 7: Update Google Sheets and Log Test Button Action
    await updateTestResult('updating');
    try {
      const testCallData = { ...callData };
      testCallData.testCall = `Test - ${new Date().toISOString()}`;
      
      // Log the test button push to the log tab with detailed information
      const filename = `test_call_${callId}_${Date.now()}.xml`;
      await sheetLog(`[TEST BUTTON] XML file uploaded to sftp.esosuite.net: ${filename} for Call ID: ${callId}`, 'info', `Call ID ${callId} - Test Button XML Upload`, xml);
      
      await sheetCallRow(testCallData, extraData, 'TEST SUCCESS', '', xml);
    } catch (sheetError) {
      logger.warn(`Google Sheets update failed during test: ${sheetError.message}`);
    }
    await new Promise(resolve => setTimeout(resolve, 400));

    // Step 8: Test completed successfully
    await updateTestResult('success');
    
    res.json({ 
      success: true, 
      message: `Test completed successfully for call ${callId}`,
      callId,
      xmlLength: xml.length,
      hasUnits: xml.includes('<Unit>'),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error(`Test failed for call ${callId}: ${error.message}`);
    
    try {
      // Log test button failure to the log tab
      await sheetLog(`[TEST BUTTON] Test failed for Call ID: ${callId} - Error: ${error.message}`, 'error', `Call ID ${callId} - Test Button Failed`, '');
      
      await updateTestResult('failed', error.message);
    } catch (updateError) {
      logger.error(`Failed to update test result: ${updateError.message}`);
    }
    
    res.status(500).json({ 
      success: false, 
      error: error.message,
      callId 
    });
  }
});

// XML Integrity Status endpoint
app.get('/integrity', (req, res) => {
  try {
    const integrityReport = xmlIntegrityMonitor.getIntegrityReport();
    res.json({
      success: true,
      integrity: integrityReport,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error(`Error getting integrity report: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test endpoints - add error handling for debugging
try {
  app.use('/api', testEndpoint);
  logger.info('Test endpoints mounted successfully at /api');
} catch (error) {
  logger.error(`Failed to mount test endpoints: ${error.message}`);
}

// Start the HTTP server immediately
app.listen(port, '0.0.0.0', () => {
  logger.info(`Health check server listening on port ${port}`);
});

// Start the main service immediately after setting up the server
main().catch(error => {
  console.error(`Service initialization failed: ${error ? error.message : 'Unknown error'}`);
  process.exit(1);
});

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
    
    // Start XML integrity monitoring
    xmlIntegrityMonitor.startMonitoring();
    logger.info('XML integrity monitoring started');
    
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
          // Process state changes as they may include closure information
          processCallAdded(callData);
        });
        
        connection.on('CallDispatched', (callData) => {
          logger.info(`⚠️ RECEIVED CALL EVENT: CallDispatched for call ID: ${callData?.CallId || 'unknown'}`);
        });
        
        connection.on('CallClosed', (callData) => {
          logger.info(`⚠️ RECEIVED CALL EVENT: CallClosed for call ID: ${callData?.CallId || 'unknown'}`);
          console.log(`⚠️ RECEIVED CALL EVENT: CallClosed for call ID: ${callData?.CallId || 'unknown'}`);
          // Process the call closure to generate final XML with closure information
          processCallAdded(callData);
        });
        
        connection.on('UnitStatusSet', (statusData) => {
          logger.info(`⚠️ RECEIVED UNIT EVENT: UnitStatusSet for unit ${statusData?.UnitId || 'unknown'}`);
          // Unit status changes might affect active calls, trigger a poll
          setTimeout(pollForRecentCalls, 2000); // Poll after 2 seconds to catch any related call changes
        });
        
        logger.info('Registered callback for CallAdded, CallClosed, CallStateChanged, and UnitStatusSet events');
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