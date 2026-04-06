/**
 * Comprehensive STN1 Status Test
 * 
 * This script searches for STN1 unit in all active calls
 * and reports all status information found.
 */
require('dotenv').config();
const axios = require('axios');

// The unit we want to check
const UNIT_TO_CHECK = 'STN1';

async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  try {
    console.log('Getting Resgrid API token...');
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('Successfully obtained API token');
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`Failed to get API token: ${error.message}`);
  }
  return null;
}

async function checkActiveCalls(token) {
  try {
    console.log(`Checking active calls for ${UNIT_TO_CHECK}...`);
    
    // Get all active calls
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      console.log('No active calls found or unexpected response format');
      return;
    }
    
    const calls = response.data.Data;
    console.log(`Found ${calls.length} active calls`);
    
    // Check each call for STN1
    for (const call of calls) {
      console.log(`Checking call ${call.CallId}: ${call.Name}`);
      
      // Get extra data for the call
      const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${call.CallId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });
      
      if (!extraResponse.data || !extraResponse.data.Data) {
        console.log(`  No extra data available for call ${call.CallId}`);
        continue;
      }
      
      const callData = extraResponse.data.Data;
      
      // Check activity data for STN1
      if (callData.Activity && Array.isArray(callData.Activity)) {
        console.log(`  Call has ${callData.Activity.length} activity entries`);
        
        for (const activity of callData.Activity) {
          if (activity.Name === UNIT_TO_CHECK) {
            console.log(`🔔 FOUND ${UNIT_TO_CHECK} in activity array for call ${call.CallId}`);
            console.log(`  StatusId: ${activity.StatusId}`);
            console.log(`  StatusText: ${activity.StatusText || 'Unknown'}`);
            console.log(`  Timestamp: ${activity.Timestamp}`);
          }
        }
      } else {
        console.log(`  Call has no activity entries`);
      }
      
      // Check dispatch data for STN1
      if (callData.Dispatches && Array.isArray(callData.Dispatches)) {
        console.log(`  Call has ${callData.Dispatches.length} dispatch entries`);
        
        for (const dispatch of callData.Dispatches) {
          if (dispatch.Name === UNIT_TO_CHECK) {
            console.log(`🔔 FOUND ${UNIT_TO_CHECK} in dispatches array for call ${call.CallId}`);
            console.log(`  StatusId: ${dispatch.StatusId}`);
            console.log(`  StatusText: ${dispatch.StatusText || 'Unknown'}`);
            console.log(`  Timestamp: ${dispatch.Timestamp}`);
          }
        }
      } else {
        console.log(`  Call has no dispatch entries`);
      }
    }
  } catch (error) {
    console.error(`Error checking active calls: ${error.message}`);
  }
}

// Try to search for STN1 in the personnel status endpoint
async function checkPersonnelStatus(token) {
  try {
    console.log(`\nChecking personnel status for ${UNIT_TO_CHECK}...`);
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Personnel/GetPersonnelStatusForDepartment', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      console.log('No personnel status data found or unexpected response format');
      return;
    }
    
    const personnel = response.data.Data;
    console.log(`Found ${personnel.length} personnel status records`);
    
    // Look for STN1 in the personnel data
    let found = false;
    for (const person of personnel) {
      if (person.Name === UNIT_TO_CHECK || 
          person.UnitName === UNIT_TO_CHECK || 
          person.Identifier === UNIT_TO_CHECK) {
        console.log(`🔔 FOUND ${UNIT_TO_CHECK} in personnel status data:`);
        console.log(`  StatusId: ${person.StatusId}`);
        console.log(`  StatusText: ${person.Status || 'Unknown'}`);
        console.log(`  Timestamp: ${person.Timestamp || 'Unknown'}`);
        found = true;
      }
    }
    
    if (!found) {
      console.log(`No personnel status data found for ${UNIT_TO_CHECK}`);
    }
  } catch (error) {
    console.log(`Error checking personnel status: ${error.message}`);
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
    }
  }
}

// Try to search for STN1 in the unit status endpoint
async function checkUnitStatus(token) {
  try {
    console.log(`\nChecking unit status for ${UNIT_TO_CHECK}...`);
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Units/GetUnitsStatuses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      console.log('No unit status data found or unexpected response format');
      return;
    }
    
    const units = response.data.Data;
    console.log(`Found ${units.length} unit status records`);
    
    // Look for STN1 in the unit data
    let found = false;
    for (const unit of units) {
      if (unit.Name === UNIT_TO_CHECK) {
        console.log(`🔔 FOUND ${UNIT_TO_CHECK} in unit status data:`);
        console.log(`  StatusId: ${unit.StatusId}`);
        console.log(`  StatusText: ${unit.Status || 'Unknown'}`);
        console.log(`  StateId: ${unit.StateId}`);
        console.log(`  StateText: ${unit.State || 'Unknown'}`);
        console.log(`  Timestamp: ${unit.Timestamp || 'Unknown'}`);
        found = true;
      }
    }
    
    if (!found) {
      console.log(`No unit status data found for ${UNIT_TO_CHECK}`);
    }
  } catch (error) {
    console.log(`Error checking unit status: ${error.message}`);
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
    }
  }
}

// Try a different unit status endpoint
async function checkAlternativeUnitStatus(token) {
  try {
    console.log(`\nChecking alternative unit status for ${UNIT_TO_CHECK}...`);
    
    const response = await axios.get('https://api.resgrid.com/api/v4/Units/GetAllUnitStatuses', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log('Response from GetAllUnitStatuses:', JSON.stringify(response.data, null, 2));
    
    if (!response.data || !response.data.Data || !Array.isArray(response.data.Data)) {
      console.log('No unit status data found or unexpected response format');
      return;
    }
    
    const units = response.data.Data;
    console.log(`Found ${units.length} unit status records`);
    
    // Look for STN1 in the unit data
    let found = false;
    for (const unit of units) {
      if (unit.Name === UNIT_TO_CHECK) {
        console.log(`🔔 FOUND ${UNIT_TO_CHECK} in alternative unit status data:`);
        console.log(`  StatusId: ${unit.StatusId}`);
        console.log(`  StatusText: ${unit.Status || 'Unknown'}`);
        console.log(`  StateId: ${unit.StateId}`);
        console.log(`  StateText: ${unit.State || 'Unknown'}`);
        console.log(`  Timestamp: ${unit.Timestamp || 'Unknown'}`);
        found = true;
      }
    }
    
    if (!found) {
      console.log(`No alternative unit status data found for ${UNIT_TO_CHECK}`);
    }
  } catch (error) {
    console.log(`Error checking alternative unit status: ${error.message}`);
    if (error.response) {
      console.log(`Status code: ${error.response.status}`);
    }
  }
}

async function main() {
  const token = await getApiToken();
  if (!token) {
    console.error('Failed to obtain API token');
    return;
  }
  
  await checkActiveCalls(token);
  await checkPersonnelStatus(token);
  await checkUnitStatus(token);
  await checkAlternativeUnitStatus(token);
  
  console.log('Test complete');
}

main().catch(console.error);