/**
 * End-to-End Test Script for Resgrid-ESO Bridge
 * This script performs a full test of the call fetching, XML generation, and Google Sheets logging
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');
const logger = require('./src/fix-logger');
const { sheetCallRow } = require('./src/sheets-logger');
const { generateXML } = require('./src/xml-generator');

// Function to get a Resgrid API token
async function getApiToken() {
  try {
    console.log('Fetching new Resgrid API token...');
    
    // Prepare request data for token
    const tokenRequestData = new URLSearchParams();
    tokenRequestData.append('grant_type', 'password');
    tokenRequestData.append('username', process.env.RESGRID_USER);
    tokenRequestData.append('password', process.env.RESGRID_PASS);
    
    // Make request to token endpoint
    const tokenResponse = await axios.post(
      'https://api.resgrid.com/api/v4/Connect/token',
      tokenRequestData.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (!tokenResponse.data || !tokenResponse.data.access_token) {
      throw new Error('Failed to obtain API token - invalid response');
    }
    
    console.log('Successfully obtained new API token');
    
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error('Failed to obtain API token:', error.message);
    throw error;
  }
}

// Function to fetch active calls from Resgrid
async function fetchActiveCalls(token) {
  try {
    console.log('Fetching active calls from Resgrid...');
    
    const response = await axios.get(
      'https://api.resgrid.com/api/v4/Calls/Active',
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to fetch calls - invalid response');
    }
    
    console.log(`Found ${response.data.length} active call(s)`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch active calls: ${error.message}`);
    throw error;
  }
}

// Function to fetch extra call data from Resgrid
async function fetchCallExtraData(token, callId) {
  try {
    console.log(`Fetching extra data for call ID: ${callId}`);
    
    const response = await axios.get(
      `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data) {
      throw new Error('Failed to fetch call extra data - invalid response');
    }
    
    console.log(`Successfully fetched extra data for call ID: ${callId}`);
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch call extra data: ${error.message}`);
    throw error;
  }
}

// Function to prepare combined call data for XML generation
function prepareCallData(basicCallData, extraCallData) {
  // Extract or generate units CSV list
  let unitsCsv = '';
  
  // Filter and extract unit names from dispatches
  if (extraCallData.Dispatches && Array.isArray(extraCallData.Dispatches)) {
    const units = extraCallData.Dispatches
      .filter(d => d.Type === 'Unit' && /^[a-zA-Z0-9]{1,9}$/.test(d.Name))
      .map(d => d.Name);
    
    unitsCsv = units.join(', ');
    console.log(`Extracted units: ${unitsCsv}`);
  } else {
    console.log('No dispatches found or not in expected format');
  }
  
  // Extract address components
  const addressLine1 = extraCallData.AddressLine1 || basicCallData.Address || '';
  const city = extraCallData.City || '';
  const state = extraCallData.State || '';
  const zip = extraCallData.ZipCode || extraCallData.Zip || '';
  const county = extraCallData.County || '';
  
  // Extract timestamps from activities
  let unitEnRouteTime = '';
  let unitArrivedTime = '';
  let unitBackInServiceTime = '';
  
  if (extraCallData.Activity && Array.isArray(extraCallData.Activity)) {
    // Look for StatusId=5 for en route time
    const enRouteActivity = extraCallData.Activity.find(a => a.StatusId === 5);
    if (enRouteActivity) {
      unitEnRouteTime = enRouteActivity.Timestamp;
      console.log(`Found unit en route time: ${unitEnRouteTime}`);
    }
    
    // Look for StatusId=6 for arrived time
    const arrivedActivity = extraCallData.Activity.find(a => a.StatusId === 6);
    if (arrivedActivity) {
      unitArrivedTime = arrivedActivity.Timestamp;
      console.log(`Found unit arrived time: ${unitArrivedTime}`);
    }
    
    // Look for "returning" status for back in service time
    // First priority: Look for "returning" keyword in activity text
    let backInServiceActivity = extraCallData.Activity.find(a => 
      a.Text && a.Text.toLowerCase().includes('returning'));
    
    // Second priority: Look for other availability statuses
    if (!backInServiceActivity) {
      backInServiceActivity = extraCallData.Activity.find(a => 
        a.Text && (
          a.Text.toLowerCase().includes('available') ||
          a.Text.toLowerCase().includes('cleared') ||
          a.Text.toLowerCase().includes('in service')
        ));
    }
    
    // Third priority: Try StatusId=2 (typically Available)
    if (!backInServiceActivity) {
      backInServiceActivity = extraCallData.Activity.find(a => a.StatusId === 2);
    }
    
    if (backInServiceActivity) {
      unitBackInServiceTime = backInServiceActivity.Timestamp;
      console.log(`Found unit back in service time: ${unitBackInServiceTime}`);
    }
  } else {
    console.log('No activities found or not in expected format');
  }
  
  // Prepare data for XML generation
  const callDataForXml = {
    CallId: basicCallData.CallId,
    Name: basicCallData.Name,
    Type: basicCallData.Type,
    LoggedOn: basicCallData.LoggedOn,
    Address: basicCallData.Address,
    Priority: basicCallData.Priority,
    Note: basicCallData.Note,
    Description: basicCallData.Description,
    ContactName: basicCallData.ContactName,
    ContactInfo: basicCallData.ContactInfo,
    ExternalId: basicCallData.ExternalId,
    
    // Add fields from extra data
    UnitsCsv: unitsCsv,
    AddressLine1: addressLine1,
    City: city,
    State: state,
    Zip: zip,
    County: county,
    
    // Add unit timestamps
    UnitEnRouteTime: unitEnRouteTime,
    UnitArrivedTime: unitArrivedTime,
    UnitBackInServiceTime: unitBackInServiceTime,
    
    // Include the raw activity array for reference
    Activity: extraCallData.Activity || [],
    Dispatches: extraCallData.Dispatches || []
  };
  
  return callDataForXml;
}

// Main function to test the process
async function main() {
  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch active calls
    const activeCalls = await fetchActiveCalls(token);
    
    if (!activeCalls || activeCalls.length === 0) {
      console.log('No active calls found to process');
      return;
    }
    
    // Sort calls by timestamp (newest first)
    activeCalls.sort((a, b) => {
      return new Date(b.LoggedOn) - new Date(a.LoggedOn);
    });
    
    // Get the most recent call
    const mostRecentCall = activeCalls[0];
    console.log(`\nProcessing most recent call: ${mostRecentCall.CallId} - ${mostRecentCall.Name}`);
    
    // Fetch extra data for the call
    const callExtraData = await fetchCallExtraData(token, mostRecentCall.CallId);
    
    // Log found fields
    console.log('\nCall base data fields:', Object.keys(mostRecentCall).join(', '));
    console.log('Call extra data fields:', Object.keys(callExtraData).join(', '));
    
    // Prepare combined call data
    const combinedCallData = prepareCallData(mostRecentCall, callExtraData);
    
    // Generate XML
    console.log('\nGenerating XML...');
    const xml = generateXML(combinedCallData);
    
    // Save XML to file
    const xmlFilePath = path.join(outputDir, `call_${mostRecentCall.CallId}.xml`);
    fs.writeFileSync(xmlFilePath, xml);
    console.log(`XML saved to ${xmlFilePath}`);
    
    // Display the XML
    console.log('\nGenerated XML:');
    console.log(xml);
    
    // Log to Google Sheets
    try {
      const sheetsResult = await sheetCallRow(combinedCallData);
      if (sheetsResult) {
        console.log('\nSuccessfully logged call data to Google Sheets');
      } else {
        console.log('\nGoogle Sheets logging skipped (not configured)');
      }
    } catch (sheetError) {
      console.warn(`\nFailed to log to Google Sheets: ${sheetError.message}`);
    }
    
    // Display Google Sheets column headers
    console.log('\nGoogle Sheets column headers for Call Data sheet:');
    console.log('Timestamp, Call ID, Nature, Priority, Address, Units, Status');
    
    console.log('\nGoogle Sheets column headers for Logs sheet:');
    console.log('Timestamp, Level, Message');
    
    console.log('\nTest completed successfully!');
    return {
      success: true,
      callId: mostRecentCall.CallId,
      xmlFilePath,
      xml
    };
  } catch (error) {
    console.error(`\nTest failed: ${error.message}`);
    return {
      success: false,
      error: error.message
    };
  }
}

// Execute the main function
main();