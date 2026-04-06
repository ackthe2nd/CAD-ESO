/**
 * Check call 198513 for unit arrival and en route times
 */
require('dotenv').config();
const axios = require('axios');

const CALL_ID = '198505'; // Try one more call ID to check for more status types

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
 * Check for unit arrival, en route, and back in service times
 */
function checkUnitTimes(callData, extraData) {
  log('Checking for unit arrival, en route, and back in service times...');
  
  // Check in call data
  log('CALL DATA:');
  if (callData.DispatchedOn) {
    log(`Unit dispatched time: ${callData.DispatchedOn}`);
  } else {
    log('No unit dispatched time found in call data');
  }
  
  // Check in extra data - Activity
  log('\nACTIVITY DATA:');
  if (extraData.Activity && extraData.Activity.length > 0) {
    log(`Found ${extraData.Activity.length} activity entries:`);
    
    // According to Resgrid API documentation:
    // Status ID 5 = En Route
    // Status ID 6 = On Scene
    // Looking for Back In Service status ID
    let enRouteTime = null;
    let onSceneTime = null;
    let backInServiceTime = null;
    
    // Map of all status IDs for reference
    const statusMap = {};
    
    extraData.Activity.forEach((activity, index) => {
      log(`Activity ${index + 1}:`);
      log(`  Type: ${activity.Type}`);
      log(`  Name: ${activity.Name}`);
      log(`  Timestamp: ${activity.Timestamp}`);
      log(`  StatusId: ${activity.StatusId}`);
      log(`  StatusText: ${activity.StatusText || 'N/A'}`);
      
      // Collect all status IDs and text for mapping
      if (activity.StatusId && activity.StatusText) {
        statusMap[activity.StatusId] = activity.StatusText;
      }
      
      if (activity.StatusId === 5 && activity.Type === 'Unit') {
        enRouteTime = activity.Timestamp;
        log(`  IDENTIFIED AS EN ROUTE TIME ✓`);
      }
      
      if (activity.StatusId === 6 && activity.Type === 'Unit') {
        onSceneTime = activity.Timestamp;
        log(`  IDENTIFIED AS ON SCENE TIME ✓`);
      }
      
      // Check for potential "back in service" status IDs
      // Common status IDs for these would be:
      // - "Available" (often StatusId 1, 2, or 3)
      // - "Available In Quarters" 
      // - "Cleared"
      // - "In Service"
      const backInServiceKeywords = ['available', 'cleared', 'in service', 'in quarter', 'complete'];
      
      if (activity.Type === 'Unit' && activity.StatusText && 
          backInServiceKeywords.some(keyword => 
            activity.StatusText.toLowerCase().includes(keyword)
          )) {
        backInServiceTime = activity.Timestamp;
        log(`  POTENTIAL BACK IN SERVICE TIME ✓ (StatusId: ${activity.StatusId}, Text: ${activity.StatusText})`);
      }
      
      // For status ID 2, which is often "Available" status
      if (activity.StatusId === 2 && activity.Type === 'Unit') {
        backInServiceTime = activity.Timestamp;
        log(`  POTENTIAL BACK IN SERVICE TIME ✓ (StatusId: 2)`);
      }
    });
    
    log('\nSTATUS ID MAPPING:');
    Object.entries(statusMap).forEach(([id, text]) => {
      log(`StatusId ${id} = "${text}"`);
    });
    
    log('\nEXTRACTED TIME DATA:');
    log(`En Route Time: ${enRouteTime || 'Not found'}`);
    log(`On Scene Time: ${onSceneTime || 'Not found'}`);
    log(`Back In Service Time: ${backInServiceTime || 'Not found'}`);
  } else {
    log('No activity data found');
  }
  
  // Check in extra data - Dispatches
  log('\nDISPATCHES DATA:');
  if (extraData.Dispatches && extraData.Dispatches.length > 0) {
    log(`Found ${extraData.Dispatches.length} dispatch entries:`);
    
    let unitDispatch = null;
    
    extraData.Dispatches.forEach((dispatch, index) => {
      log(`Dispatch ${index + 1}:`);
      log(`  Type: ${dispatch.Type}`);
      log(`  Name: ${dispatch.Name}`);
      log(`  Timestamp: ${dispatch.Timestamp}`);
      
      if (dispatch.Type === 'Unit') {
        unitDispatch = dispatch;
        log(`  IDENTIFIED AS UNIT DISPATCH ✓`);
      }
      
      // Check for any additional timestamp fields
      const dispatchObj = { ...dispatch };
      delete dispatchObj.Type;
      delete dispatchObj.Name;
      delete dispatchObj.Timestamp;
      
      const additionalFields = Object.keys(dispatchObj).filter(key => 
        dispatchObj[key] && 
        typeof dispatchObj[key] === 'string' && 
        (key.includes('Time') || key.includes('timestamp') || key.includes('date'))
      );
      
      if (additionalFields.length > 0) {
        log('  Additional time fields:');
        additionalFields.forEach(field => {
          log(`    ${field}: ${dispatchObj[field]}`);
        });
      }
    });
    
    if (unitDispatch) {
      log('\nUnit dispatch object:');
      console.log(JSON.stringify(unitDispatch, null, 2));
    }
  } else {
    log('No dispatch data found');
  }
  
  // Generate sample XML with times
  log('\nSAMPLE XML WITH TIMES:');
  const enRouteTime = extraData.Activity?.find(a => a.StatusId === 5)?.Timestamp || '';
  const onSceneTime = extraData.Activity?.find(a => a.StatusId === 6)?.Timestamp || '';
  
  // For back in service time, check for various status IDs
  // We'll prioritize StatusId 2 if available, as it's commonly "Available"
  let backInServiceTime = '';
  
  // Check for known "back in service" keywords in status text
  const backInServiceKeywords = ['available', 'cleared', 'in service', 'in quarter', 'complete'];
  const backInServiceActivity = extraData.Activity?.find(a => 
    a.Type === 'Unit' && 
    a.StatusText && 
    backInServiceKeywords.some(keyword => a.StatusText.toLowerCase().includes(keyword))
  );
  
  // Try StatusId 2 (often "Available")
  const availableActivity = extraData.Activity?.find(a => a.Type === 'Unit' && a.StatusId === 2);
  
  if (backInServiceActivity) {
    backInServiceTime = backInServiceActivity.Timestamp;
  } else if (availableActivity) {
    backInServiceTime = availableActivity.Timestamp;
  }
  
  const sampleXml = `<CadIncident>
  <IncidentNumber>${callData.CallId}</IncidentNumber>
  <UnitEnRoute>${enRouteTime}</UnitEnRoute>
  <UnitArrivedOnScene>${onSceneTime}</UnitArrivedOnScene>
  <UnitBackInService>${backInServiceTime}</UnitBackInService>
  <!-- Other fields omitted for brevity -->
</CadIncident>`;
  
  log(sampleXml);
}

/**
 * Main function
 */
async function main() {
  try {
    log(`Starting to check call ${CALL_ID} for unit arrival and en route times...`);
    
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
    
    // Check unit times
    checkUnitTimes(callData, extraData);
    
    log('Completed checking call data');
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