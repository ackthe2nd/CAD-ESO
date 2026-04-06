/**
 * Resgrid to ESO Bridge - Fetch and Show XML Sample
 *
 * This script fetches a recent call from Resgrid API,
 * generates XML for it, and displays the XML.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');

// Load utility functions
const { mapPriorityToEsoCode } = require('./src/utils/priority');

// Configuration
const config = {
  resgrid: {
    tokenUrl: 'https://api.resgrid.com/api/v4/Connect/token',
    callsUrl: 'https://api.resgrid.com/api/v4/Calls/GetCallExtraData'
  },
  auth: {
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }
};

// Logger function for consistent logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMethod = isError ? console.error : console.log;
  logMethod(`${timestamp} - ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  try {
    log('Fetching new Resgrid API token...');
    
    // Encode credentials for Basic Auth
    const tokenResponse = await axios.post(
      config.resgrid.tokenUrl,
      new URLSearchParams({
        grant_type: 'password',
        username: config.auth.username,
        password: config.auth.password
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (tokenResponse.data && tokenResponse.data.access_token) {
      log('Successfully obtained new API token');
      return tokenResponse.data.access_token;
    } else {
      throw new Error('Invalid token response from Resgrid API');
    }
  } catch (error) {
    log(`Failed to get API token: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    throw error;
  }
}

/**
 * Fetch recent calls from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {number} days - How many days back to fetch calls for
 * @returns {Promise<Array>} List of calls
 */
async function fetchRecentCalls(token, days = 7) {
  try {
    log(`Fetching calls from the last ${days} days...`);
    
    // Calculate the date for N days ago
    const daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - days);
    
    // Using GetCalls endpoint instead
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCalls', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data) {
      log(`Found ${response.data.length} calls in the response`);
      return response.data;
    } else {
      log('No calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Error fetching calls: ${error.message}`, true);
    if (error.response) {
      log(`Response status: ${error.response.status}`, true);
      log(`Response data: ${JSON.stringify(error.response.data)}`, true);
    }
    return [];
  }
}

/**
 * Fetches detailed call data from Resgrid API
 * @param {string} token - The API token for authentication
 * @param {string} callId - The ID of the call to fetch data for
 * @returns {Promise<Object>} The detailed call data
 */
async function getCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    
    const response = await axios.get(config.resgrid.callsUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: {
        callId: callId
      }
    });
    
    if (response.data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data;
    } else {
      throw new Error(`Invalid response for call ${callId}`);
    }
  } catch (error) {
    log(`Error fetching call extra data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Generates XML for ESO from call data
 */
function generateXML(callData) {
  try {
    log('Generating XML...');
    
    // FIX: Use template strings to generate XML instead of xmlbuilder2 to avoid formatting issues
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>${callData.CallId}</IncidentNumber>
  <IncidentOrOnset>${callData.Timestamp || new Date().toISOString()}</IncidentOrOnset>`;
    
    // Add units (EmsUnitCallSign)
    if (callData.UnitsCsv) {
      xml += `\n  <EmsUnitCallSign>${callData.UnitsCsv}</EmsUnitCallSign>`;
    }
    
    // Add complaint (ComplaintReportedByDispatch)
    if (callData.Nature) {
      xml += `\n  <ComplaintReportedByDispatch>${callData.Nature}</ComplaintReportedByDispatch>`;
    }
    
    // Add dispatch location (VehicleDispatchLocation)
    if (callData.Address) {
      xml += `\n  <VehicleDispatchLocation>${callData.Address}</VehicleDispatchLocation>`;
    }
    
    // Add dispatch notes (CadDispatchText)
    if (callData.Notes) {
      xml += `\n  <CadDispatchText>${callData.Notes}</CadDispatchText>`;
    }
    
    // Add priority-based fields
    if (callData.ResponseModeToScene) {
      xml += `\n  <ResponseModeToScene>${callData.ResponseModeToScene}</ResponseModeToScene>`;
    }
    
    if (callData.Priority) {
      xml += `\n  <EMD_Performed>${callData.Priority}</EMD_Performed>`;
    }
    
    // Add address components
    if (callData.IncidentAddress1) {
      xml += `\n  <IncidentAddress1>${callData.IncidentAddress1}</IncidentAddress1>`;
    }
    
    if (callData.IncidentAddress2) {
      xml += `\n  <IncidentAddress2>${callData.IncidentAddress2}</IncidentAddress2>`;
    }
    
    // City, County, State, Zip
    if (callData.City) {
      xml += `\n  <IncidentCity>${callData.City}</IncidentCity>`;
    }
    
    if (callData.County) {
      xml += `\n  <IncidentCounty>${callData.County}</IncidentCounty>`;
    }
    
    if (callData.State) {
      xml += `\n  <IncidentState>${callData.State}</IncidentState>`;
    }
    
    if (callData.Zip) {
      xml += `\n  <IncidentZip>${callData.Zip}</IncidentZip>`;
    }
    
    // Destination
    if (callData.DestinationName) {
      xml += `\n  <DestinationName>${callData.DestinationName}</DestinationName>`;
    }
    
    // Additional location information
    if (callData.GeoLocation) {
      xml += `\n  <GeoLocation>${callData.GeoLocation}</GeoLocation>`;
    }
    
    if (callData.CrossStreet) {
      xml += `\n  <CrossStreet>${callData.CrossStreet}</CrossStreet>`;
    }
    
    if (callData.MapPage) {
      xml += `\n  <MapPage>${callData.MapPage}</MapPage>`;
    }
    
    // Caller information
    if (callData.ReportingParty) {
      xml += `\n  <ReportingParty>${callData.ReportingParty}</ReportingParty>`;
    }
    
    if (callData.ReportingPhone) {
      xml += `\n  <ContactPhone>${callData.ReportingPhone}</ContactPhone>`;
    }
    
    // Call status
    if (callData.CallStatus) {
      xml += `\n  <CAD_VehicleDisposition>${callData.CallStatus}</CAD_VehicleDisposition>`;
    }
    
    if (callData.Driver) {
      xml += `\n  <Driver>${callData.Driver}</Driver>`;
    }
    
    if (callData.RunNumber) {
      xml += `\n  <RunNumber>${callData.RunNumber}</RunNumber>`;
    }
    
    // Timestamps
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
    
    log('XML generation completed');
    return xml;
  } catch (error) {
    log(`Error generating XML: ${error.message}`, true);
    throw error;
  }
}

/**
 * Process a single call from Resgrid
 * @param {string} token - The API token for authentication
 * @param {Object} call - The basic call data
 * @returns {Promise<Object>} The XML and related data
 */
async function processCall(token, call) {
  try {
    log(`Processing call ${call.CallId}...`);
    
    // Get extra data for the call
    const callExtraData = await getCallExtraData(token, call.CallId);
    
    // Extract address components - handle different formats
    let addressLine1 = '';
    let addressLine2 = '';
    let city = '';
    let county = '';
    let state = '';
    let zip = '';
    
    // Try to extract from callExtraData if available
    if (callExtraData.AddressLine1) addressLine1 = callExtraData.AddressLine1;
    if (callExtraData.AddressLine2) addressLine2 = callExtraData.AddressLine2;
    if (callExtraData.City) city = callExtraData.City;
    if (callExtraData.County) county = callExtraData.County;
    if (callExtraData.State) state = callExtraData.State;
    if (callExtraData.ZipCode || callExtraData.Zip) zip = callExtraData.ZipCode || callExtraData.Zip;
    
    // Simple fallback - try to extract from the full address if components aren't available
    if (!addressLine1 && call.Address) {
      addressLine1 = call.Address;
      
      // Very simple parsing - just for demonstration
      const parts = call.Address.split(',');
      if (parts.length > 1) {
        addressLine1 = parts[0].trim();
        
        if (parts.length > 2) {
          city = parts[1].trim();
          
          // Try to extract state and zip from the last part (e.g., "NY 12345")
          const lastPart = parts[parts.length - 1].trim();
          const stateZipMatch = lastPart.match(/([A-Z]{2})\s+(\d{5}(-\d{4})?)/);
          
          if (stateZipMatch) {
            state = stateZipMatch[1];
            zip = stateZipMatch[2];
          }
        }
      }
    }
    
    // Get unit call signs - filter and process
    let unitsCsv = '';
    if (callExtraData.Dispatches && Array.isArray(callExtraData.Dispatches)) {
      const unitCallSigns = callExtraData.Dispatches
        .filter(d => d.Type === 'Unit' && /^\d{4,5}$/.test(d.Name))
        .map(d => d.Name);
      
      unitsCsv = unitCallSigns.join(',');
    }
    
    // Map priority ID to ESO response mode
    let responseModeToScene = '';
    if (callExtraData.Priority && callExtraData.Priority.Id) {
      responseModeToScene = mapPriorityToEsoCode(callExtraData.Priority.Id);
    }
    
    // Generate run number - use CallId if no specific run number
    const runNumber = callExtraData.CallId || call.CallId;
    
    // Prepare the data for XML generation
    const callDataForXml = {
      CallId: callExtraData.CallId || call.CallId,
      Timestamp: callExtraData.LoggedOn || callExtraData.LoggedOnUtc || call.Timestamp || new Date().toISOString(),
      Nature: callExtraData.Name || callExtraData.Nature || call.Nature || '',
      Address: callExtraData.FullAddress || call.Address || '',
      UnitsCsv: unitsCsv,
      Notes: callExtraData.Note || callExtraData.Notes || call.Notes || '',
      
      // Address components
      IncidentAddress1: addressLine1,
      IncidentAddress2: addressLine2,
      City: city,
      County: county,
      State: state,
      Zip: zip,
      DestinationName: callExtraData.DestinationName || '',
      
      // ESO mapped fields
      Priority: call.Priority || (callExtraData.Priority ? callExtraData.Priority.Name : '') || '',
      RunNumber: runNumber,
      ResponseModeToScene: responseModeToScene,
      
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
    
    // Create a unique filename
    const timestamp = Date.now();
    const filename = `call_${call.CallId}_${timestamp}.xml`;
    
    // Save XML to the logs directory
    const logsDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    const xmlFilePath = path.join(logsDir, filename);
    fs.writeFileSync(xmlFilePath, xmlData);
    
    log(`XML saved to: ${xmlFilePath}`);
    
    return {
      callId: call.CallId,
      nature: callDataForXml.Nature,
      xmlData,
      xmlFilePath
    };
  } catch (error) {
    log(`Error processing call ${call.CallId}: ${error.message}`, true);
    throw error;
  }
}

/**
 * Main function to process calls
 */
async function main() {
  try {
    log('Starting to fetch and process calls...');
    
    // Get API token
    const token = await getApiToken();
    
    // Get recent calls
    const calls = await fetchRecentCalls(token);
    
    if (calls.length === 0) {
      log('No calls found to process.', true);
      return;
    }
    
    // Process the most recent call
    const recentCall = calls[0];
    log(`Selected call ${recentCall.CallId} for processing`);
    
    // Process the call and generate XML
    const result = await processCall(token, recentCall);
    
    // Display information about the processed call
    log('\n=== Call Details ===');
    log(`Call ID: ${result.callId}`);
    log(`Nature: ${result.nature}`);
    log(`XML File: ${result.xmlFilePath}`);
    
    // Display the XML
    log('\n=== XML Content ===');
    console.log(result.xmlData);
    
    log('\nProcess completed successfully');
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the main function
main();