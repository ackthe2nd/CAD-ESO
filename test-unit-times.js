/**
 * Test script to verify extraction of unit times (en route and on scene)
 * from Activity array in Resgrid API response
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CALL_ID = '198513'; // Known to have unit timestamps

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

/**
 * Gets a valid Resgrid API token
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
 * Fetch call data from Resgrid API
 */
async function fetchCallData(token, callId) {
  try {
    log(`Fetching data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`Invalid response format for call ${callId}`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch call extra data from Resgrid API
 */
async function fetchCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`Invalid response format for call extra data ${callId}`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call extra data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Extract unit name and filter dispatches to find valid units
 */
function extractUnitName(callData, extraData) {
  let unitName = '';
  
  // First check if there's a UnitsCsv field available
  if (callData.UnitsCsv) {
    const unitsList = callData.UnitsCsv.split(',').map(u => u.trim());
    const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
    
    if (validUnit) {
      unitName = validUnit;
      log(`Found valid unit from UnitsCsv: ${unitName}`);
      return unitName;
    }
  }
  
  // If no unit found from UnitsCsv, try the Dispatches array
  if (extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
    // Filter for units with Type='Unit' and Name matching alphanumeric pattern with 9 or fewer characters
    const validUnits = extraData.Dispatches.filter(d => 
      d.Type === 'Unit' && 
      d.Name && 
      d.Name.length <= 9 && 
      /^[a-zA-Z0-9]+$/.test(d.Name)
    );
    
    // Use the first valid unit if available
    if (validUnits.length > 0) {
      unitName = validUnits[0].Name;
      log(`Found valid unit from Dispatches: ${unitName}`);
      return unitName;
    }
  }
  
  log('Could not find a valid unit name');
  return '';
}

/**
 * Test extraction of unit times from Activity array
 */
function testUnitTimesExtraction(extraData, unitName) {
  log(`Testing unit times extraction for unit: ${unitName}`);
  
  if (!extraData.Activity || !Array.isArray(extraData.Activity)) {
    log('No Activity array found in the call data', true);
    return null;
  }
  
  log(`Activity array contains ${extraData.Activity.length} entries`);
  
  // Filter activities for the unit we're interested in
  const unitActivities = extraData.Activity.filter(a => 
    a.Type === 'Unit' && a.Name === unitName
  );
  
  log(`Found ${unitActivities.length} activities for unit ${unitName}`);
  
  // Log all unit activities for inspection
  unitActivities.forEach((activity, i) => {
    log(`Activity ${i+1}:`);
    log(`  Type: ${activity.Type}`);
    log(`  Name: ${activity.Name}`);
    log(`  StatusId: ${activity.StatusId}`);
    log(`  StatusText: ${activity.StatusText || 'N/A'}`);
    log(`  Timestamp: ${activity.Timestamp}`);
  });
  
  // Extract En Route (StatusId = 5) and On Scene (StatusId = 6) times
  const enRouteActivity = unitActivities.find(a => a.StatusId === 5);
  const onSceneActivity = unitActivities.find(a => a.StatusId === 6);
  
  log('\nExtracting specific status timestamps:');
  
  if (enRouteActivity) {
    log(`Found en route time (StatusId 5): ${enRouteActivity.Timestamp}`);
  } else {
    log('No en route time found');
  }
  
  if (onSceneActivity) {
    log(`Found on scene time (StatusId 6): ${onSceneActivity.Timestamp}`);
  } else {
    log('No on scene time found');
  }
  
  // Generate sample XML format with times
  const unitEnRouteTime = enRouteActivity ? enRouteActivity.Timestamp : '';
  const unitArrivedOnSceneTime = onSceneActivity ? onSceneActivity.Timestamp : '';
  
  const sampleXml = `<CadIncident>
  <IncidentNumber>${extraData.CallId || ''}</IncidentNumber>
  <UnitEnRoute>${unitEnRouteTime}</UnitEnRoute>
  <UnitArrivedOnScene>${unitArrivedOnSceneTime}</UnitArrivedOnScene>
  <!-- Other fields omitted for brevity -->
</CadIncident>`;
  
  log('\nSample XML output:');
  log(sampleXml);
  
  return {
    unitName,
    enRouteTime: enRouteActivity ? enRouteActivity.Timestamp : null,
    onSceneTime: onSceneActivity ? onSceneActivity.Timestamp : null
  };
}

/**
 * Main function to run the test
 */
async function main() {
  try {
    log(`Starting unit times extraction test for call ID ${CALL_ID}...`);
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch call data
    const callData = await fetchCallData(token, CALL_ID);
    if (!callData) {
      log(`Cannot process call ${CALL_ID}`, true);
      return;
    }
    
    // Fetch call extra data
    const extraData = await fetchCallExtraData(token, CALL_ID);
    if (!extraData) {
      log(`Cannot process call extra data for ${CALL_ID}`, true);
      return;
    }
    
    // Extract unit name
    const unitName = extractUnitName(callData, extraData);
    if (!unitName) {
      log('Cannot extract unit times without a valid unit', true);
      return;
    }
    
    // Test unit times extraction
    const unitTimes = testUnitTimesExtraction(extraData, unitName);
    
    if (unitTimes && (unitTimes.enRouteTime || unitTimes.onSceneTime)) {
      log('Test passed - successfully extracted unit times');
      
      // Save test results to logs directory
      const resultsDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(resultsDir)) {
        fs.mkdirSync(resultsDir, { recursive: true });
      }
      
      const resultsPath = path.join(resultsDir, `unit_times_test_${CALL_ID}.json`);
      fs.writeFileSync(resultsPath, JSON.stringify(unitTimes, null, 2));
      
      log(`Test results saved to ${resultsPath}`);
    } else {
      log('Test failed - could not extract unit times', true);
    }
    
  } catch (error) {
    log(`Error in test: ${error.message}`, true);
    process.exit(1);
  }
}

// Run the test
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});