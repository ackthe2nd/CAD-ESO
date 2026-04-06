/**
 * Resgrid to ESO Bridge - Fixed Fetch Existing Calls Utility
 * 
 * This script fetches existing calls from Resgrid API, 
 * generates XML for each, and uploads them to ESO via SFTP.
 * 
 * Usage:
 *   node fixed-fetch-existing-calls.js [--days=N]
 *   where N is the number of days to look back (default: 7)
 * 
 * NOTE: This version includes fixed API endpoints for PowerShell environment
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const os = require('os');
const axios = require('axios');
const SftpClient = require('ssh2-sftp-client');
const { logger } = require('./src/logger');

// Set up config
const config = {
  app: {
    logsDir: path.join(__dirname, 'logs')
  },
  resgrid: {
    baseUrl: 'https://api.resgrid.com/api/v4',
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  },
  sftp: {
    host: process.env.SFTP_HOST || 'sftp.esosuite.net',
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER || process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASS || process.env.SFTP_PASSWORD,
    remotePath: process.env.SFTP_DIR || '/incoming'
  },
  esoGuid: 'B1C8A98C-DB5C-45D7-8975-8D3CA6211179'
};

// Mapping for Resgrid Priority ID to ESO response mode code
const PRIORITY_TO_ESO_MAP = {
  '1': '390', // Code 1/Emergency (Hot)
  '2': '390', // Code 2/Urgent (Hot)
  '3': '690'  // Code 3/Non-urgent (Cold)
};

const DEFAULT_RESPONSE_MODE = '390'; // Default to Emergency

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

// API token management
let apiToken = null;

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  try {
    if (apiToken) {
      return apiToken;
    }
    
    logger.info('Fetching new Resgrid API token...');
    
    const tokenResponse = await axios.post(
      `${config.resgrid.baseUrl}/Connect/token`,
      `grant_type=password&username=${encodeURIComponent(config.resgrid.username)}&password=${encodeURIComponent(config.resgrid.password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    apiToken = tokenResponse.data.access_token;
    logger.info('Successfully obtained new API token');
    
    return apiToken;
  } catch (error) {
    logger.error(`Error getting API token: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
    }
    throw error;
  }
}

/**
 * Get an authenticated API client
 */
async function getApiClient() {
  const token = await getApiToken();
  
  return axios.create({
    baseURL: config.resgrid.baseUrl,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
}

/**
 * Fetch call extra data from Resgrid API
 */
async function getCallExtraData(callId) {
  try {
    logger.info(`Fetching extra data for Call ID: ${callId}`);
    
    const apiClient = await getApiClient();
    const response = await apiClient.get(`/Calls/GetCallExtraData?callId=${callId}`);
    
    if (response.data && response.data.Data) {
      return response.data.Data;
    } else {
      logger.warn(`No extra data found for Call ID: ${callId}`);
      return null;
    }
  } catch (error) {
    logger.error(`Failed to fetch call data for Call ID: ${callId}: ${error.message}`);
    if (error.response) {
      logger.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Fetch recent calls from Resgrid API
 */
async function getRecentCalls(days) {
  try {
    logger.info(`Fetching calls from the last ${days} days`);
    
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Format dates for API
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    logger.info(`Date range: ${startDateStr} to ${endDateStr}`);
    
    const apiClient = await getApiClient();
    
    // First try: Use GetCalls with date parameters
    try {
      const response = await apiClient.get(`/Calls/GetCalls?startDate=${encodeURIComponent(startDateStr)}&endDate=${encodeURIComponent(endDateStr)}`);
      
      if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
        logger.info(`Retrieved ${response.data.Data.length} calls from date range`);
        return response.data.Data;
      }
    } catch (error) {
      logger.warn(`Failed with GetCalls date range: ${error.message}`);
    }
    
    // Second try: Use GetActiveCalls
    try {
      logger.info('Trying fallback to GetActiveCalls endpoint');
      const response = await apiClient.get('/Calls/GetActiveCalls');
      
      if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
        logger.info(`Retrieved ${response.data.Data.length} active calls as fallback`);
        return response.data.Data;
      }
    } catch (error) {
      logger.warn(`Failed with GetActiveCalls endpoint: ${error.message}`);
    }
    
    // If we get here, all attempts failed
    logger.warn('All methods to fetch calls failed, returning empty array');
    return [];
  } catch (error) {
    logger.error(`Failed to fetch recent calls: ${error.message}`);
    return [];
  }
}

/**
 * Map priority ID to ESO response mode code
 */
function mapPriorityToEsoCode(priorityId) {
  if (!priorityId) {
    return DEFAULT_RESPONSE_MODE;
  }
  
  const eosPriorityCode = PRIORITY_TO_ESO_MAP[priorityId];
  return eosPriorityCode || DEFAULT_RESPONSE_MODE;
}

/**
 * Generates XML for ESO from call data
 */
function generateXML(callData) {
  try {
    logger.info(`Generating XML for Call ID: ${callData.CallId}`);
    
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
    if (callData.UnitNotifiedTime) {
      xml += `\n  <UnitNotifiedByDispatch>${callData.UnitNotifiedTime}</UnitNotifiedByDispatch>`;
    }
    
    if (callData.UnitEnRouteTime) {
      xml += `\n  <UnitEnRoute>${callData.UnitEnRouteTime}</UnitEnRoute>`;
    }
    
    if (callData.UnitArrivedTime) {
      xml += `\n  <UnitArrivedOnScene>${callData.UnitArrivedTime}</UnitArrivedOnScene>`;
    }
    
    if (callData.UnitAtPatientTime) {
      xml += `\n  <UnitAtPatient>${callData.UnitAtPatientTime}</UnitAtPatient>`;
    }
    
    if (callData.UnitClearedTime) {
      xml += `\n  <UnitCleared>${callData.UnitClearedTime}</UnitCleared>`;
    }
    
    // Close the XML
    xml += '\n</CadIncident>';
    
    return xml;
  } catch (error) {
    logger.error(`Error generating XML for Call ID ${callData.CallId}: ${error.message}`, { error });
    throw error;
  }
}

/**
 * Uploads a file to ESO via SFTP with retry logic
 */
async function uploadToSFTP(localFilePath, remoteFilePath, maxRetries = 3) {
  const sftp = new SftpClient();
  let retryCount = 0;
  
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
        const delay = Math.pow(2, retryCount - 1) * 1000;
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
        
        return false;
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
    if (callExtraData.Dispatches && callExtraData.Dispatches.length > 0) {
      // Extract unit names from dispatches and filter to only include actual units (not users)
      const units = callExtraData.Dispatches
        .filter(dispatch => {
          // Ensure it's a unit by checking:
          // 1. Type is Unit
          // 2. Name is alphanumeric and less than 15 chars
          const isUnit = dispatch.Type === 'Unit';
          const nameLength = dispatch.Name ? dispatch.Name.length <= 15 : false;
          const isAlphanumeric = dispatch.Name ? /^[a-zA-Z0-9-]+$/.test(dispatch.Name) : false;
          
          logger.info(`Unit: ${dispatch.Name}, Type: ${dispatch.Type}, Length: ${dispatch.Name ? dispatch.Name.length : 0}, Alphanumeric: ${isAlphanumeric}, Valid: ${isUnit && nameLength && isAlphanumeric}`);
          
          return isUnit && nameLength && isAlphanumeric;
        })
        .map(dispatch => dispatch.Name);
      
      if (units.length > 0) {
        unitsCsv = units.join(',');
        logger.info(`Using units from dispatches: ${unitsCsv}`);
      } else {
        // If no valid units found, use the first dispatch entity name as the unit
        if (callExtraData.Dispatches[0] && callExtraData.Dispatches[0].Name) {
          unitsCsv = callExtraData.Dispatches[0].Name;
          logger.info(`No valid units found, using first dispatch entity: ${unitsCsv}`);
        } else {
          logger.warn(`No valid units found in dispatches`);
        }
      }
    } else {
      logger.warn(`No dispatches found for Call ID: ${call.CallId}`);
    }
    
    // Process address components
    let address, city, state, zip;
    
    if (call.Address) {
      // Try to parse components from the address string
      const parts = call.Address.split(',').map(part => part.trim());
      
      // Last part might contain state and zip
      if (parts.length > 1) {
        const lastPart = parts[parts.length - 1];
        const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
        
        if (stateZipMatch) {
          state = stateZipMatch[1];
          zip = stateZipMatch[2];
          // Remove state/zip from the last part
          parts[parts.length - 1] = lastPart.replace(stateZipMatch[0], '').trim();
        }
        
        // If the last part doesn't have state/zip or after removing them, it might be the city
        if (parts.length > 1 && parts[parts.length - 1] !== '') {
          city = parts[parts.length - 1];
          parts.pop();
        }
        
        // Remaining parts form the street address
        address = parts.join(', ');
      } else {
        address = call.Address;
      }
    }
    
    // Check for unit timestamps in the call activity
    let unitEnRouteTime, unitArrivedTime, unitAtPatientTime, unitClearedTime;
    
    if (callExtraData.Activity && callExtraData.Activity.length > 0) {
      // Filter to only include activities for valid units
      const unitActivities = callExtraData.Activity.filter(activity => {
        if (!activity.Name) return false;
        
        // Check if the activity is for a unit in our unitsCsv list
        const unitsArray = unitsCsv.split(',');
        return unitsArray.some(unit => activity.Name.includes(unit));
      });
      
      if (unitActivities.length > 0) {
        logger.info(`Found ${unitActivities.length} activities for unit ${unitsCsv}`);
        
        // Sort activities by timestamp (newest first)
        unitActivities.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
        
        // Look for specific status changes
        for (const activity of unitActivities) {
          if (activity.StatusId === 5 && !unitEnRouteTime) {
            unitEnRouteTime = activity.Timestamp;
            logger.info(`Found en route time: ${unitEnRouteTime}`);
          } else if (activity.StatusId === 6 && !unitArrivedTime) {
            unitArrivedTime = activity.Timestamp;
            logger.info(`Found on scene time: ${unitArrivedTime}`);
          } else if (activity.StatusId === 3 && !unitAtPatientTime) {
            unitAtPatientTime = activity.Timestamp;
            logger.info(`Found at patient time: ${unitAtPatientTime}`);
          } else if ((activity.StatusId === 8 || activity.StatusId === 2 || activity.StatusId === 0) && !unitClearedTime) {
            unitClearedTime = activity.Timestamp;
            logger.info(`Found cleared time: ${unitClearedTime}`);
          }
        }
      } else {
        logger.warn(`No activities found for units in ${unitsCsv}`);
      }
    }
    
    // Build a data object for XML generation
    const callDataForXml = {
      CallId: call.CallId,
      Timestamp: call.LoggedOn,
      Nature: call.Name || '',
      Address: address || call.Address || '',
      Notes: call.Note || '',
      UnitsCsv: unitsCsv,
      
      // Optional fields from parsing
      City: city || '',
      State: state || '',
      Zip: zip,
      DestinationName: callExtraData.DestinationName || '',
      
      // ESO mapped fields
      Priority: call.Priority || (callExtraData.Priority ? callExtraData.Priority.Name : '') || '',  // Used for internal reference only
      RunNumber: callExtraData.RunNumber || call.Number || '',
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
      UnitNotifiedTime: callExtraData.UnitNotifiedTime || call.UnitNotifiedTime || '',
      UnitEnRouteTime: unitEnRouteTime || callExtraData.UnitEnRouteTime || call.UnitEnRouteTime || '',
      UnitArrivedTime: unitArrivedTime || callExtraData.UnitArrivedTime || call.UnitArrivedTime || '',
      UnitAtPatientTime: unitAtPatientTime || callExtraData.UnitAtPatientTime || call.UnitAtPatientTime || '',
      UnitClearedTime: unitClearedTime || callExtraData.UnitClearedTime || call.UnitClearedTime || ''
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
    
    // Upload to ESO if configured
    if (config.sftp.host !== 'sftp.example.com') {
      const remoteFilePath = path.join(config.sftp.remotePath, 'calls', filename);
      const uploadResult = await uploadToSFTP(localFilePath, remoteFilePath);
      if (uploadResult) {
        logger.info(`Successfully uploaded call ${call.CallId} to ESO`);
      } else {
        logger.error(`Failed to upload call ${call.CallId} to ESO`);
      }
    } else {
      logger.warn('SFTP not configured, skipping upload');
    }
    
    // Clean up temporary file
    fs.unlinkSync(localFilePath);
    logger.info(`Removed temporary file: ${localFilePath}`);
    
    return true;
  } catch (error) {
    logger.error(`Error processing call ${call.CallId}: ${error.message}`);
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
        logger.info(`Processing call: ${call.CallId || 'Unknown'}, Name: ${call.Name || 'Unknown'}`);
        const result = await processCall(call);
        if (result) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        logger.error(`Error processing call ${call.CallId || 'Unknown'}: ${err.message}`);
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