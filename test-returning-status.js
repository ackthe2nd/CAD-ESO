/**
 * Test "returning" status detection specifically for call 198513
 * This script will fetch the call and test various detection methods
 */
require('dotenv').config();
const axios = require('axios');

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
 * Fetch call data for call 198513
 */
async function fetchCallData(token) {
  const callId = '198513';
  
  try {
    log(`Fetching data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No data found for call ${callId}`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch extra data for call 198513
 */
async function fetchCallExtraData(token) {
  const callId = '198513';
  
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
      log(`No extra data found for call ${callId}`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call extra data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Test returning status detection with our current logic
 */
function testReturningDetection(callData, extraData) {
  log('\nTESTING RETURNING STATUS DETECTION');
  
  // Get a valid unit name
  let unitName = '';
  
  if (callData.UnitsCsv) {
    const unitsList = callData.UnitsCsv.split(',').map(u => u.trim());
    const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
    if (validUnit) {
      unitName = validUnit;
      log(`Found unit name from UnitsCsv: ${unitName}`);
    }
  }
  
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
  
  if (!unitName) {
    log('No valid unit name found', true);
    return;
  }
  
  // Check activity array for status info
  if (!extraData.Activity || !Array.isArray(extraData.Activity)) {
    log('No activity data found in call extra data', true);
    return;
  }
  
  // Filter for activities related to our unit
  const unitActivities = extraData.Activity.filter(a => 
    a.Type === 'Unit' && a.Name === unitName
  );
  
  log(`Found ${unitActivities.length} activities for unit ${unitName}`);
  
  // Sort activities by timestamp to show timeline
  unitActivities.sort((a, b) => {
    const dateA = new Date(a.Timestamp);
    const dateB = new Date(b.Timestamp);
    return dateA - dateB;
  });
  
  // Display all activities
  log('\nUNIT ACTIVITY TIMELINE:');
  unitActivities.forEach((activity, index) => {
    log(`Activity ${index + 1}:`);
    log(`  Timestamp: ${activity.Timestamp}`);
    log(`  StatusId: ${activity.StatusId}`);
    log(`  StatusText: ${activity.StatusText || 'N/A'}`);
  });
  
  // Test our current detection logic
  log('\nCURRENT RETURNING STATUS DETECTION:');
  
  // Available StatusId test
  const availableStatusActivity = unitActivities.find(a => a.StatusId === 2);
  if (availableStatusActivity) {
    log(`StatusId 2 detected at ${availableStatusActivity.Timestamp}`);
    log(`  StatusText: ${availableStatusActivity.StatusText || 'N/A'}`);
  } else {
    log('No StatusId 2 (Available) found');
  }
  
  // Keyword matching
  const keywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
  log('\nKEYWORD DETECTION:');
  
  const matchedActivities = [];
  
  unitActivities.forEach(activity => {
    if (!activity.StatusText) return;
    
    const activityText = activity.StatusText.toLowerCase();
    const matchedKeyword = keywords.find(keyword => activityText.includes(keyword));
    
    if (matchedKeyword) {
      matchedActivities.push({
        timestamp: activity.Timestamp,
        statusId: activity.StatusId,
        statusText: activity.StatusText,
        matchedKeyword: matchedKeyword
      });
    }
  });
  
  if (matchedActivities.length > 0) {
    log(`Found ${matchedActivities.length} activities matching our keywords:`);
    matchedActivities.forEach((match, i) => {
      log(`Match ${i+1}: '${match.matchedKeyword}' in "${match.statusText}"`);
      log(`  StatusId: ${match.statusId}, Timestamp: ${match.timestamp}`);
    });
  } else {
    log('No activities matched our keywords');
  }
  
  // Try alternate detection method - look for "returning" in any field
  log('\nALTERNATE DETECTION - FULL OBJECT SEARCH:');
  const returningInAnyField = [];
  
  unitActivities.forEach(activity => {
    // Convert the activity object to a string
    const activityStr = JSON.stringify(activity).toLowerCase();
    
    if (activityStr.includes('returning')) {
      returningInAnyField.push({
        timestamp: activity.Timestamp,
        statusId: activity.StatusId,
        statusText: activity.StatusText || 'N/A'
      });
    }
  });
  
  if (returningInAnyField.length > 0) {
    log(`Found ${returningInAnyField.length} activities with 'returning' in any field:`);
    returningInAnyField.forEach((activity, i) => {
      log(`Activity ${i+1}: ${activity.statusText}`);
      log(`  StatusId: ${activity.statusId}, Timestamp: ${activity.timestamp}`);
    });
  } else {
    log('No activities contained "returning" in any field');
  }
  
  // Generate XML for the call with our xml-generator
  const { generateXML } = require('./src/xml-generator');
  try {
    log('\nTESTING XML GENERATION WITH CALL DATA:');
    
    // Format data correctly for the generator
    const xml = generateXML(callData, extraData, true);
    
    // Check if the BackInService field is populated in the XML
    const backInServiceMatch = xml.match(/<UnitBackInService>(.*?)<\/UnitBackInService>/);
    if (backInServiceMatch && backInServiceMatch[1]) {
      log(`UnitBackInService field populated with: ${backInServiceMatch[1]}`);
    } else {
      log('UnitBackInService field is empty in generated XML');
    }
  } catch (error) {
    log(`Error generating XML: ${error.message}`, true);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    log('Starting test for "returning" status detection on call 198513...');
    
    // Get API token
    const token = await getApiToken();
    
    // Fetch call data
    const callData = await fetchCallData(token);
    if (!callData) {
      log('Cannot proceed without call data', true);
      return;
    }
    
    // Fetch extra data
    const extraData = await fetchCallExtraData(token);
    if (!extraData) {
      log('Cannot proceed without call extra data', true);
      return;
    }
    
    // Test returning status detection
    testReturningDetection(callData, extraData);
    
    log('Completed returning status test');
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