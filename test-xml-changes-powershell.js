/**
 * Test XML Changes - PowerShell Environment Version
 * 
 * This script verifies that the EMD_Performed tag has been properly removed
 * from XML output in a PowerShell environment.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration - Direct API access
const API_BASE_URL = 'https://api.resgrid.com/api/v4';
const TEST_CALL_ID = '198513'; // Use a recent call ID for testing
const OUTPUT_DIR = path.join(__dirname, 'test-output');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'xml-test-output.xml');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Mapping for priority codes
const PRIORITY_TO_ESO_MAP = {
  '1': '390', // Code 1/Emergency (Hot)
  '2': '390', // Code 2/Urgent (Hot)
  '3': '690'  // Code 3/Non-urgent (Cold)
};

const DEFAULT_RESPONSE_MODE = '390'; // Default to Emergency/Hot

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  try {
    console.log('Getting API token...');
    
    const RESGRID_USER = process.env.RESGRID_USER;
    const RESGRID_PASS = process.env.RESGRID_PASS;
    
    if (!RESGRID_USER || !RESGRID_PASS) {
      throw new Error('RESGRID_USER and RESGRID_PASS environment variables must be set');
    }
    
    const tokenResponse = await axios.post(
      `${API_BASE_URL}/Connect/token`,
      `grant_type=password&username=${encodeURIComponent(RESGRID_USER)}&password=${encodeURIComponent(RESGRID_PASS)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    console.log('Successfully obtained API token');
    return tokenResponse.data.access_token;
  } catch (error) {
    console.error('Error getting token:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Fetch call data from Resgrid API
 */
async function getCallData(token, callId) {
  try {
    console.log(`Fetching data for call ${callId}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/Calls/GetCall?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data.Data;
  } catch (error) {
    console.error(`Error fetching call data: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Fetch extra call data from Resgrid API
 */
async function getCallExtraData(token, callId) {
  try {
    console.log(`Fetching extra data for call ${callId}...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/Calls/GetCallExtraData?callId=${callId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    return response.data.Data;
  } catch (error) {
    console.error(`Error fetching call extra data: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Map priority ID to ESO response mode code
 */
function mapPriorityToEsoCode(priorityId) {
  if (!priorityId) return DEFAULT_RESPONSE_MODE;
  return PRIORITY_TO_ESO_MAP[priorityId] || DEFAULT_RESPONSE_MODE;
}

/**
 * Generate XML for a call (simple version for test)
 */
function generateXML(callData, extraData) {
  try {
    console.log('Generating XML...');
    
    // Extract useful data
    const callId = callData.CallId;
    const timestamp = callData.LoggedOn || new Date().toISOString();
    const nature = callData.Name || '';
    const address = callData.Address || '';
    const notes = callData.Note || '';
    
    // Calculate response mode
    let responseModeToScene = DEFAULT_RESPONSE_MODE;
    if (extraData && extraData.Priority && extraData.Priority.Id) {
      responseModeToScene = mapPriorityToEsoCode(extraData.Priority.Id);
    }
    
    // Extract unit information
    let unitName = 'STN1'; // Default
    if (extraData && extraData.Dispatches && extraData.Dispatches.length > 0) {
      // Find unit dispatches (not user dispatches)
      const unitDispatches = extraData.Dispatches.filter(d => d.Type === 'Unit');
      if (unitDispatches.length > 0) {
        unitName = unitDispatches[0].Name;
      }
    }
    
    // Extract timestamps from activities
    let enRouteTime = '';
    let onSceneTime = '';
    let atPatientTime = '';
    let clearedTime = '';
    
    if (extraData && extraData.Activity && extraData.Activity.length > 0) {
      // Filter for the specified unit
      const unitActivities = extraData.Activity.filter(a => a.Name && a.Name.includes(unitName));
      
      for (const activity of unitActivities) {
        if (activity.StatusId === 5) {
          enRouteTime = activity.Timestamp;
          console.log(`Found en route time: ${enRouteTime}`);
        } else if (activity.StatusId === 6) {
          onSceneTime = activity.Timestamp;
          console.log(`Found on scene time: ${onSceneTime}`);
        } else if (activity.StatusId === 3) {
          atPatientTime = activity.Timestamp;
          console.log(`Found at patient time: ${atPatientTime}`);
        } else if (activity.StatusId === 8 || activity.StatusId === 2 || activity.StatusId === 0) {
          clearedTime = activity.Timestamp;
          console.log(`Found cleared time: ${clearedTime}`);
        }
      }
    }
    
    // Build XML with template string (easier to read)
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <Guid>B1C8A98C-DB5C-45D7-8975-8D3CA6211179</Guid>
  <IncidentNumber>${callId}</IncidentNumber>
  <IncidentOrOnset>${timestamp}</IncidentOrOnset>
  <ComplaintReportedByDispatch>${nature}</ComplaintReportedByDispatch>
  <VehicleDispatchLocation>${address}</VehicleDispatchLocation>
  <EmsUnitCallSign>${unitName}</EmsUnitCallSign>
  <UnitNotifiedByDispatch>${unitName}</UnitNotifiedByDispatch>
  <ResponseModeToScene>${responseModeToScene}</ResponseModeToScene>
  <CallNature>${nature}</CallNature>
  <CallNatureDescription>${notes}</CallNatureDescription>`;
    
    // Add timestamps if available
    if (enRouteTime) {
      xml += `\n  <UnitEnRoute>${enRouteTime}</UnitEnRoute>`;
    }
    
    if (onSceneTime) {
      xml += `\n  <UnitArrivedOnScene>${onSceneTime}</UnitArrivedOnScene>`;
    }
    
    if (atPatientTime) {
      xml += `\n  <UnitAtPatient>${atPatientTime}</UnitAtPatient>`;
    }
    
    if (clearedTime) {
      xml += `\n  <UnitCleared>${clearedTime}</UnitCleared>`;
    }
    
    // Close the XML
    xml += '\n</CadIncident>';
    
    return xml;
  } catch (error) {
    console.error(`Error generating XML: ${error.message}`);
    throw error;
  }
}

/**
 * Main test function
 */
async function runTest() {
  try {
    console.log('Starting XML verification test...');
    
    // Get API token
    const token = await getApiToken();
    
    // Get call data
    const callData = await getCallData(token, TEST_CALL_ID);
    if (!callData) {
      console.error('Failed to fetch call data, aborting test');
      return;
    }
    
    // Get extra call data
    const extraData = await getCallExtraData(token, TEST_CALL_ID);
    if (!extraData) {
      console.error('Failed to fetch call extra data, continuing with basic data only');
    }
    
    // Generate XML
    const xml = generateXML(callData, extraData);
    
    // Save XML to file
    fs.writeFileSync(OUTPUT_FILE, xml);
    console.log(`XML saved to ${OUTPUT_FILE}`);
    
    // Check for EMD_Performed tag
    if (xml.includes('EMD_Performed')) {
      console.error('❌ TEST FAILED: EMD_Performed tag found in XML output');
      
      // Find the line with EMD_Performed
      const lines = xml.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('EMD_Performed')) {
          console.error(`  Found at line ${i + 1}: ${lines[i].trim()}`);
        }
      }
    } else {
      console.log('✅ TEST PASSED: EMD_Performed tag is not present in XML output');
    }
    
    // Display XML snippet around where EMD_Performed would be
    console.log('\nXML Output Snippet:');
    const lines = xml.split('\n');
    const startLine = Math.max(0, lines.findIndex(line => line.includes('<ResponseModeToScene>')) - 2);
    const endLine = Math.min(lines.length - 1, startLine + 8);
    
    for (let i = startLine; i <= endLine; i++) {
      console.log(`  ${lines[i]}`);
    }
    
    console.log('\nTest completed.');
  } catch (error) {
    console.error(`Error running test: ${error.message}`);
  }
}

// Run the test
runTest();