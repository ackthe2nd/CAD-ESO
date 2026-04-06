/**
 * Test script to verify back in service time extraction from call data
 * This script checks to see if we can properly extract "back in service" 
 * times from call data using various detection methods
 */
require('dotenv').config();
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');
const path = require('path');

const CALL_ID = '198505'; // Try another call ID to check for back in service data

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

/**
 * Gets a valid Resgrid API token
 * @returns {Promise<string>} A valid API token
 */
async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  if (!username || !password) {
    throw new Error('Missing Resgrid credentials in environment variables');
  }
  
  try {
    log('Getting Resgrid API token...');
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      log('Successfully obtained API token');
      return response.data.access_token;
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    log(`Failed to get API token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch call data for a specific call ID
 */
async function fetchCallData(token, callId) {
  try {
    log(`Fetching basic data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched basic data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No data found for call ${callId} or invalid response format`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch extra data for a specific call ID
 */
async function fetchCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No extra data found for call ${callId} or invalid response format`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call extra data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Test the back in service time extraction
 */
function testBackInServiceExtraction(callData, extraData) {
  log('Testing Back In Service time extraction...');
  
  // Extract unit name for tracking unit activities
  let unitName = '';
  
  // First try from UnitsCsv field
  if (callData.UnitsCsv) {
    const unitsList = callData.UnitsCsv.split(',').map(u => u.trim());
    const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
    if (validUnit) {
      unitName = validUnit;
      log(`Found unit name from UnitsCsv: ${unitName}`);
    }
  }
  
  // If no unit name yet, try from Dispatches
  if (!unitName && extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
    const validUnits = extraData.Dispatches.filter(d => 
      d.Type === 'Unit' && 
      d.Name && 
      d.Name.length <= 9 && 
      /^[a-zA-Z0-9]+$/.test(d.Name)
    );
    
    if (validUnits.length > 0) {
      unitName = validUnits[0].Name;
      log(`Found unit name from Dispatches: ${unitName}`);
    }
  }
  
  // If we have a unit name, look for its activities
  if (unitName && extraData.Activity && Array.isArray(extraData.Activity)) {
    const validUnitActivities = extraData.Activity.filter(a => 
      a.Type === 'Unit' && a.Name === unitName && a.Timestamp
    );
    
    if (validUnitActivities.length > 0) {
      log(`Found ${validUnitActivities.length} activities for unit ${unitName}`);
      
      // Get en route and on scene times for reference
      const enRouteActivity = validUnitActivities.find(a => a.StatusId === 5);
      const onSceneActivity = validUnitActivities.find(a => a.StatusId === 6);
      
      log(`En Route time: ${enRouteActivity?.Timestamp || 'Not found'}`);
      log(`On Scene time: ${onSceneActivity?.Timestamp || 'Not found'}`);
      
      // Testing Strategy 1: Look for status text with "available", "cleared", "returning", etc.
      log('\nTesting Back In Service Extraction - Strategy 1: Status Text Keywords');
      const backInServiceKeywords = ['available', 'cleared', 'in service', 'in quarter', 'complete', 'returning'];
      const backInServiceByKeyword = validUnitActivities.find(a => 
        a.StatusText && backInServiceKeywords.some(keyword => 
          a.StatusText.toLowerCase().includes(keyword)
        )
      );
      
      if (backInServiceByKeyword) {
        log(`✓ Found back in service time by keyword: ${backInServiceByKeyword.Timestamp}`);
        log(`  StatusId: ${backInServiceByKeyword.StatusId}, StatusText: ${backInServiceByKeyword.StatusText}`);
      } else {
        log('✗ No back in service time found by keyword matching');
      }
      
      // Testing Strategy 2: Look for status ID 2 (commonly "Available")
      log('\nTesting Back In Service Extraction - Strategy 2: StatusId = 2 (Available)');
      const availableActivity = validUnitActivities.find(a => a.StatusId === 2);
      
      if (availableActivity) {
        log(`✓ Found back in service time by StatusId 2: ${availableActivity.Timestamp}`);
        log(`  StatusText: ${availableActivity.StatusText || 'N/A'}`);
      } else {
        log('✗ No back in service time found with StatusId 2');
      }
      
      // Testing Strategy 3: Look for fallback to UnitCleared time
      log('\nTesting Back In Service Extraction - Strategy 3: Fallback to UnitCleared time');
      if (callData.ClearedTime) {
        log(`✓ Found potential back in service time from call.ClearedTime: ${callData.ClearedTime}`);
      } else {
        log('✗ No UnitCleared time available');
      }
      
      // Log all status IDs and text for reference
      log('\nAll Status IDs and Text in Activities:');
      const activityMap = {};
      validUnitActivities.forEach(a => {
        if (a.StatusId && a.StatusText) {
          activityMap[a.StatusId] = a.StatusText;
        }
      });
      
      Object.entries(activityMap).forEach(([id, text]) => {
        log(`StatusId ${id} = "${text}"`);
      });
    } else {
      log(`No activities found for unit ${unitName}`, true);
    }
  } else {
    log('No valid unit name found or no activity data available', true);
  }
  
  // Now generate XML with our existing generator and see what it produces
  log('\nGenerating XML with existing generator:');
  const xml = generateXML(callData, extraData);
  
  // Extract the UnitBackInService tag value from the XML
  const backInServiceMatch = xml.match(/<UnitBackInService>(.*?)<\/UnitBackInService>/);
  if (backInServiceMatch && backInServiceMatch[1]) {
    log(`UnitBackInService in generated XML: ${backInServiceMatch[1]}`);
  } else {
    log('No UnitBackInService found in generated XML');
  }
  
  // Save the generated XML for reference
  const logDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const xmlPath = path.join(logDir, `test-back-in-service-${callData.CallId}.xml`);
  fs.writeFileSync(xmlPath, xml);
  log(`Saved test XML to ${xmlPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    log(`Starting back in service time extraction test for call ${CALL_ID}...`);
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch call data
    const callData = await fetchCallData(token, CALL_ID);
    if (!callData) {
      log(`Cannot find call with ID ${CALL_ID}`, true);
      return;
    }
    
    // Fetch extra data
    const extraData = await fetchCallExtraData(token, CALL_ID);
    if (!extraData) {
      log(`Cannot find extra data for call with ID ${CALL_ID}`, true);
      return;
    }
    
    // Test the back in service time extraction
    testBackInServiceExtraction(callData, extraData);
    
    log('Completed back in service time extraction test');
  } catch (error) {
    log(`Error in main process: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error(error);
  process.exit(1);
});