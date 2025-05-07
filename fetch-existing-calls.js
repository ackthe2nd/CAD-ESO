/**
 * Resgrid to ESO Bridge - Fetch Existing Calls Utility
 * 
 * This script fetches existing calls from Resgrid API, 
 * generates XML for each, and uploads them to ESO via SFTP.
 * 
 * Usage:
 *   node fetch-existing-calls.js [--days=N]
 *   where N is the number of days to look back (default: 7)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const SftpClient = require('ssh2-sftp-client');
const { logger } = require('./src/logger');
const { sheetCallRow } = require('./src/sheets-logger');
const { config } = require('./src/config');
const { getCallExtraData, getRecentCalls } = require('./src/resgrid-api');
const { mapPriorityToEsoCode, DEFAULT_RESPONSE_MODE } = require('./src/utils/priority');
const { create } = require('xmlbuilder2');

// Parse command line arguments
const args = process.argv.slice(2);
const daysArg = args.find(arg => arg.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

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
 * Generates XML for ESO from call data
 */
function generateXML(callData) {
  try {
    logger.info(`Generating XML for Call ID: ${callData.CallId}`);
    
    // Log available fields for debugging
    logger.debug('Available call data fields: ' + Object.keys(callData).join(', '));
    
    // Determine response mode
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
    
    // FIX: Use template strings to ensure proper XML formatting and avoid issues with xmlbuilder2
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>${config.esoGuid}</Guid>
  <IncidentNumber>${callData.CallId}</IncidentNumber>
  <IncidentOrOnset>${callData.Timestamp || new Date().toISOString()}</IncidentOrOnset>
  <ComplaintReportedByDispatch>${callData.Nature || ''}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>${callData.Address || ''}</VehicleDispatchLocation>
  <EmsUnitCallSign>${callData.UnitsCsv || ''}</EmsUnitCallSign>
  <CadDispatchText>${callData.Notes || ''}</CadDispatchText>
  <ResponseModeToScene>${responseModeToScene}</ResponseModeToScene>`;
    
    // Add detailed address fields if available
    if (callData.IncidentAddress1) {
      xml += `\n  <IncidentAddress1>${callData.IncidentAddress1}</IncidentAddress1>`;
    }
    
    if (callData.IncidentAddress2) {
      xml += `\n  <IncidentAddress2>${callData.IncidentAddress2}</IncidentAddress2>`;
    }
    
    // Add location information
    if (callData.City) {
      xml += `\n  <DestinationCity>${callData.City}</DestinationCity>`;
    }
    
    if (callData.County) {
      xml += `\n  <DestinationCounty>${callData.County}</DestinationCounty>`;
    }
    
    if (callData.State) {
      xml += `\n  <DestinationState>${callData.State}</DestinationState>`;
    }
    
    if (callData.Zip) {
      xml += `\n  <DestinationZip>${callData.Zip}</DestinationZip>`;
    }
    
    if (callData.DestinationName) {
      xml += `\n  <DestinationName>${callData.DestinationName}</DestinationName>`;
    }
    
    // EMD_Performed tag has been removed as requested
    
    // Add location details
    if (callData.GeoLocation) {
      xml += `\n  <GeoLocation>${callData.GeoLocation}</GeoLocation>`;
    }
    
    if (callData.CrossStreet) {
      xml += `\n  <CrossStreet>${callData.CrossStreet}</CrossStreet>`;
    }
    
    // Add caller information
    if (callData.ReportingParty) {
      xml += `\n  <ReportingParty>${callData.ReportingParty}</ReportingParty>`;
    }
    
    if (callData.ReportingPhone) {
      xml += `\n  <ContactPhone>${callData.ReportingPhone}</ContactPhone>`;
    }
    
    // Add additional identifiers
    if (callData.MapPage) {
      xml += `\n  <MapPage>${callData.MapPage}</MapPage>`;
    }
    
    if (callData.RunNumber) {
      xml += `\n  <RunNumber>${callData.RunNumber}</RunNumber>`;
    }
    
    // Add call status
    if (callData.CallStatus) {
      xml += `\n  <CAD_VehicleDisposition>${callData.CallStatus}</CAD_VehicleDisposition>`;
    }
    
    // Add driver information
    if (callData.Driver) {
      xml += `\n  <Driver>${callData.Driver}</Driver>`;
    }
    
    // Add timestamps
    if (callData.TransferOfPatientTime) {
      xml += `\n  <TransferOfPatientTimeOnScene>${callData.TransferOfPatientTime}</TransferOfPatientTimeOnScene>`;
    }
    
    if (callData.DispatchClosedTime) {
      xml += `\n  <CAD_ClosedTime>${callData.DispatchClosedTime}</CAD_ClosedTime>`;
    }
    
    if (callData.UnitNotifiedTime) {
      xml += `\n  <CAD_UnitNotifiedTime>${callData.UnitNotifiedTime}</CAD_UnitNotifiedTime>`;
    }
    
    if (callData.UnitEnRouteTime) {
      xml += `\n  <CAD_EnrouteTime>${callData.UnitEnRouteTime}</CAD_EnrouteTime>`;
    }
    
    if (callData.UnitArrivedTime) {
      xml += `\n  <CAD_ArrivedTime>${callData.UnitArrivedTime}</CAD_ArrivedTime>`;
    }
    
    // Close the root element
    xml += `\n</CadIncident>`;
    
    logger.info(`Successfully generated XML for Call ID: ${callData.CallId}`);
    return xml;
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
 * Process a single call from Resgrid
 * @param {Object} call - The basic call data
 * @returns {Promise<boolean>} Success status
 */
async function processCall(call) {
  try {
    logger.info(`Processing call: ${call.CallId}`);
    
    // Fetch additional data for the call
    logger.info(`Fetching extra data for Call ID: ${call.CallId}`);
    
    const callExtraData = await getCallExtraData(call.CallId);
    if (!callExtraData) {
      logger.error(`Failed to fetch extra data for Call ID: ${call.CallId}`);
      return false;
    }
    
    // Extract or generate units CSV list
    let unitsCsv = '';
    
    // Filter and extract unit names from dispatches
    if (callExtraData.Dispatches && Array.isArray(callExtraData.Dispatches)) {
      const units = callExtraData.Dispatches
        .filter(d => d.Type === 'Unit' && /^\d{4,5}$/.test(d.ID))
        .map(d => d.Name);
      
      unitsCsv = units.join(', ');
      logger.info(`Extracted units: ${unitsCsv}`);
    } else {
      logger.warn(`No dispatches found for Call ID: ${call.CallId}`);
    }
    
    // Extract address components
    let addressLine1 = callExtraData.AddressLine1 || call.Address || '';
    let addressLine2 = callExtraData.AddressLine2 || '';
    let city = callExtraData.City || '';
    let state = callExtraData.State || '';
    let zip = callExtraData.ZipCode || callExtraData.Zip || '';
    let county = callExtraData.County || '';
    
    // Parse full address if individual components not provided
    if (!city && !state && call.Address) {
      const addressParts = call.Address.split(',');
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
    const runNumber = callExtraData.CallId || call.CallId || '';
    
    // Extract ResponseModeToScene from Priority ID
    let responseModeToScene = DEFAULT_RESPONSE_MODE; // Use our centralized default from the utility
    if (callExtraData.Priority && callExtraData.Priority.Id) {
      // Use our centralized utility function for mapping
      responseModeToScene = mapPriorityToEsoCode(callExtraData.Priority.Id);
      logger.info(`Mapped Resgrid Priority ID ${callExtraData.Priority.Id} to ESO ResponseModeToScene ${responseModeToScene}`);
    } else {
      // If Priority is missing entirely, log that we're using the default
      logger.warn(`No Resgrid Priority ID found, using default ResponseModeToScene ${responseModeToScene}`);
    }
    
    // Prepare data for XML generation with additional fields according to ESO mapping
    const callDataForXml = {
      // Required fields
      CallId: callExtraData.CallId || call.CallId,
      Timestamp: callExtraData.LoggedOn || callExtraData.LoggedOnUtc || call.Timestamp || new Date().toISOString(),
      Nature: callExtraData.Name || callExtraData.Nature || call.Nature || '',
      Address: callExtraData.FullAddress || call.Address || '',
      UnitsCsv: unitsCsv,
      Notes: callExtraData.Notes || callExtraData.Note || call.Notes || '',
      
      // Additional address components
      IncidentAddress1: addressLine1,
      IncidentAddress2: addressLine2,
      City: city,
      County: county,
      State: state,
      Zip: zip,
      DestinationName: callExtraData.DestinationName || '',
      
      // ESO mapped fields
      Priority: call.Priority || (callExtraData.Priority ? callExtraData.Priority.Name : '') || '',  // Used for internal reference only
      RunNumber: runNumber,
      ResponseModeToScene: responseModeToScene, // ESO response mode mapped from Resgrid Priority.Id
      
      // Additional location information
      GeoLocation: `${callExtraData.Latitude || ''},${callExtraData.Longitude || ''}`,
      CrossStreet: callExtraData.CrossStreet || call.CrossStreet || '',
      MapPage: callExtraData.MapPage || call.MapPage || '',
      
      // Caller information
      ReportingParty: callExtraData.ReportingParty || call.ReportingParty || '',
      ReportingPhone: callExtraData.ReportingPartyPhone || call.ReportingPhone || '',
      
      // Call status
      CallStatus: callExtraData.CallState || call.CallStatus || '',
      
      // Driver information
      Driver: callExtraData.Driver || call.Driver || '',
      
      // Timestamps
      TransferOfPatientTime: callExtraData.TransferPatientTime || call.TransferOfPatientTime || '',
      DispatchClosedTime: callExtraData.DispatchClosedTime || call.DispatchClosedTime || '',
      UnitNotifiedTime: callExtraData.UnitNotifiedTime || call.UnitNotifiedTime || '',
      UnitEnRouteTime: callExtraData.UnitEnRouteTime || call.UnitEnRouteTime || '',
      UnitArrivedTime: callExtraData.UnitArrivedTime || call.UnitArrivedTime || ''
    };
    
    // Generate XML
    const xmlData = generateXML(callDataForXml);
    
    // Create unique filename with timestamp to prevent collisions
    const timestamp = Date.now();
    const filename = `call_${call.CallId}_${timestamp}.xml`;
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
      logger.info(`Successfully uploaded call ${call.CallId} to ESO`);
      
      // Clean up temporary file
      fs.unlinkSync(localFilePath);
      logger.info(`Removed temporary file: ${localFilePath}`);
      
      // Log successful call data to Google Sheets
      try {
        logger.info(`Logging call ${call.CallId} to Google Sheets`);
        await sheetCallRow(callDataForXml);
        logger.info(`Successfully logged call ${call.CallId} to Google Sheets`);
      } catch (sheetError) {
        // Don't fail the entire process if Sheet logging fails
        logger.warn(`Failed to log call ${call.CallId} to Google Sheets: ${sheetError.message}`);
      }
      
      return true;
    } catch (error) {
      logger.error(`Failed to upload call ${call.CallId} to ESO`, { error: error.message });
      return false;
    }
  } catch (error) {
    logger.error(`Error processing call ${call.CallId}`, { error: error.message });
    return false;
  }
}

/**
 * Main function to process all recent calls
 */
async function main() {
  try {
    logger.info(`Fetching calls from last ${days} days...`);
    
    const calls = await getRecentCalls(days);
    
    if (!calls || calls.length === 0) {
      logger.info('No calls found for processing');
      return;
    }
    
    logger.info(`Found ${calls.length} calls from the last ${days} days`);
    
    // Process each call
    let successCount = 0;
    let failCount = 0;
    
    // Process in sequence (not parallel) to avoid overloading the server
    for (const call of calls) {
      try {
        const result = await processCall(call);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        logger.error(`Error processing call ${call.CallId}: ${err.message}`);
        failCount++;
      }
    }
    
    logger.info(`Processing complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    logger.error(`Failed to process calls: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();