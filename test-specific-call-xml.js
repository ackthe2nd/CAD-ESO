/**
 * Test script to fetch a specific call and generate XML for it
 * This will fetch a specific call ID, generate XML, and display it
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { create } = require('xmlbuilder2');
const logger = require('./src/fix-logger');
const { sheetCallRow } = require('./src/sheets-logger');

// Get the call ID from command line argument or use a default
const callId = process.argv[2] || '198513'; // Use the most recent call by default

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

// Function to get call details
async function getCallDetails(token, callId) {
  try {
    console.log(`Fetching details for call ID: ${callId}`);
    
    // First get basic call info
    const callResponse = await axios.get(
      `https://api.resgrid.com/api/v4/Calls/Call?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!callResponse.data) {
      throw new Error('Failed to fetch basic call data - invalid response');
    }
    
    // Then get extra call data
    const extraResponse = await axios.get(
      `https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!extraResponse.data) {
      throw new Error('Failed to fetch extra call data - invalid response');
    }
    
    // Combine the data
    const combinedData = {
      ...callResponse.data,
      ...extraResponse.data
    };
    
    console.log(`Successfully fetched details for call ID: ${callId}`);
    console.log('Call data fields:', Object.keys(combinedData).join(', '));
    
    return combinedData;
  } catch (error) {
    console.error(`Failed to fetch call details: ${error.message}`);
    throw error;
  }
}

// Function to generate XML for the call
function generateTemplateXML(callData) {
  // Add the UnitsCsv field from dispatched units
  let unitsCsv = '';
  if (callData.Dispatches && Array.isArray(callData.Dispatches)) {
    const units = callData.Dispatches
      .filter(d => d.Type === 'Unit' && /^[a-zA-Z0-9]{1,9}$/.test(d.Name))
      .map(d => d.Name);
    
    unitsCsv = units.join(', ');
  }
  
  // Extract timestamps from activities
  let unitEnRouteTime = '';
  let unitArrivedTime = '';
  let unitBackInServiceTime = '';
  
  if (callData.Activity && Array.isArray(callData.Activity)) {
    // Look for StatusId=5 for en route time
    const enRouteActivity = callData.Activity.find(a => a.StatusId === 5);
    if (enRouteActivity) {
      unitEnRouteTime = enRouteActivity.Timestamp;
    }
    
    // Look for StatusId=6 for arrived time
    const arrivedActivity = callData.Activity.find(a => a.StatusId === 6);
    if (arrivedActivity) {
      unitArrivedTime = arrivedActivity.Timestamp;
    }
    
    // Look for returning status for back in service time
    // First try to find "returning" keyword in activity text
    let backInServiceActivity = callData.Activity.find(a => 
      a.Text && a.Text.toLowerCase().includes('returning'));
    
    // If not found, look for other availability statuses
    if (!backInServiceActivity) {
      backInServiceActivity = callData.Activity.find(a => 
        a.Text && (
          a.Text.toLowerCase().includes('available') ||
          a.Text.toLowerCase().includes('cleared') ||
          a.Text.toLowerCase().includes('in service')
        ));
    }
    
    // If still not found, try StatusId=2 (typically Available)
    if (!backInServiceActivity) {
      backInServiceActivity = callData.Activity.find(a => a.StatusId === 2);
    }
    
    if (backInServiceActivity) {
      unitBackInServiceTime = backInServiceActivity.Timestamp;
    }
  }
  
  // Extract address components
  const addressLine1 = callData.AddressLine1 || callData.Address || '';
  const city = callData.City || '';
  const state = callData.State || '';
  const zip = callData.ZipCode || callData.Zip || '';
  
  // Determine priority code mapping
  let responseModeToScene = '390'; // Default to emergent (lights & sirens)
  if (callData.Priority && callData.Priority.Id) {
    if (callData.Priority.Id === 1559) {
      responseModeToScene = '395'; // Non-emergent (no lights & sirens)
    }
  }
  
  // Create XML using template string for reliable formatting
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>5F4A88C2-A18D-49E0-8A92-EF8764D2A483</Guid>
  <IncidentNumber>${callData.CallId}</IncidentNumber>
  <IncidentOrOnset>${callData.LoggedOn || callData.Timestamp || new Date().toISOString()}</IncidentOrOnset>
  <ComplaintReportedByDispatch>${callData.Type || callData.Name || ''}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>${addressLine1}</VehicleDispatchLocation>
  <EmsUnitCallSign>${unitsCsv}</EmsUnitCallSign>
  <CadDispatchText>${callData.Description || callData.Note || ''}</CadDispatchText>
  <ResponseModeToScene>${responseModeToScene}</ResponseModeToScene>
  <IncidentAddress1>${addressLine1}</IncidentAddress1>
  <IncidentCity>${city}</IncidentCity>
  <IncidentState>${state}</IncidentState>
  <IncidentZip>${zip}</IncidentZip>
  <CallNature>${callData.Name || ''}</CallNature>
  <CallNatureDescription>${callData.Description || ''}</CallNatureDescription>
  <ReportingParty>${callData.ContactName || ''}</ReportingParty>
  <ContactPhone>${callData.ContactInfo || ''}</ContactPhone>
  <PatientFirstName>${callData.ContactName ? callData.ContactName.split(' ')[0] : ''}</PatientFirstName>
  <PatientLastName>${callData.ContactName ? callData.ContactName.split(' ').slice(1).join(' ') : ''}</PatientLastName>
  <CAD_UnitNotifiedTime>${callData.LoggedOn || ''}</CAD_UnitNotifiedTime>
  <CAD_EnrouteTime>${unitEnRouteTime}</CAD_EnrouteTime>
  <CAD_ArrivedTime>${unitArrivedTime}</CAD_ArrivedTime>
  <UnitBackInService>${unitBackInServiceTime}</UnitBackInService>
  <EMD_Performed>${callData.Priority && callData.Priority.Name || ''}</EMD_Performed>
</CadIncident>`;

  return xml;
}

// Main function
async function main() {
  try {
    // Get API token
    const token = await getApiToken();
    
    // Fetch call details
    const callData = await getCallDetails(token, callId);
    
    // Generate XML
    const xml = generateTemplateXML(callData);
    
    // Create output directory if it doesn't exist
    const outputDir = path.join(__dirname, 'test-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Save XML to file
    const outputPath = path.join(outputDir, `call_${callId}.xml`);
    fs.writeFileSync(outputPath, xml);
    
    console.log(`\nXML for call ID ${callId} generated successfully and saved to ${outputPath}`);
    console.log('\nGenerated XML:');
    console.log(xml);
    
    // Log to Google Sheets if configured
    try {
      const sheetsResult = await sheetCallRow(callData);
      if (sheetsResult) {
        console.log('\nSuccessfully logged call data to Google Sheets');
      } else {
        console.log('\nSkipped Google Sheets logging (not configured)');
      }
    } catch (sheetError) {
      console.warn(`\nFailed to log to Google Sheets: ${sheetError.message}`);
    }
    
    return { success: true, xml };
  } catch (error) {
    console.error(`\nError in test: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Execute the main function
main();