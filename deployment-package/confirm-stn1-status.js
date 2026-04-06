/**
 * Confirm STN1 Status
 * 
 * This script provides a detailed report on STN1's current status
 * using the correct unit ID (8826).
 */
require('dotenv').config();
const axios = require('axios');

// Resgrid API configuration
const RESGRID_USER = process.env.RESGRID_USER;
const RESGRID_PASS = process.env.RESGRID_PASS;
const API_BASE_URL = 'https://api.resgrid.com/api/v4';

// STN1 Unit ID
const STN1_UNIT_ID = '8826';

// Status ID to text mapping
const STATUS_MAPPING = {
  0: 'Available',
  2: 'Available (Alt)',
  3: 'Committed/At Patient',
  4: 'Out of Service',
  5: 'Responding/En Route',
  6: 'On Scene',
  7: 'Staging',
  8: 'Returning'
};

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  try {
    console.log('Getting Resgrid API token...');
    
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
 * Get information about all units
 */
async function getUnitInfos(token) {
  try {
    console.log('\n===== Checking UnitInfos =====');
    console.log('Querying Units/GetAllUnitsInfos endpoint...');
    
    const response = await axios.get(
      `${API_BASE_URL}/Units/GetAllUnitsInfos`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No unit infos found');
      return null;
    }
    
    const units = response.data.Data;
    console.log(`Found ${units.length} units`);
    
    // Find STN1 in unit infos
    const stn1Unit = units.find(
      unit => unit.UnitId === STN1_UNIT_ID || unit.Name === 'STN1'
    );
    
    if (stn1Unit) {
      console.log('✅ FOUND STN1 in units list:');
      console.log(`  Unit ID: ${stn1Unit.UnitId}`);
      console.log(`  Name: ${stn1Unit.Name}`);
      console.log(`  Type: ${stn1Unit.Type}`);
      console.log(`  Status ID: ${stn1Unit.UnitStatusId}`);
      console.log(`  Status Text: ${stn1Unit.CurrentStatus || 'Unknown'}`);
      console.log(`  Mapped Status: ${STATUS_MAPPING[stn1Unit.UnitStatusId] || 'Unknown'}`);
      return stn1Unit;
    }
    
    console.log('❌ STN1 not found in units list');
    return null;
  } catch (error) {
    console.error(`Error getting unit infos: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Get direct unit status for STN1
 */
async function getDirectUnitStatus(token) {
  try {
    console.log('\n===== Checking Direct Unit Status =====');
    console.log(`Querying UnitStatus/GetUnitStatus?unitId=${STN1_UNIT_ID} endpoint...`);
    
    const response = await axios.get(
      `${API_BASE_URL}/UnitStatus/GetUnitStatus?unitId=${STN1_UNIT_ID}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No status data found');
      return null;
    }
    
    const status = response.data.Data;
    console.log('✅ FOUND STN1 status:');
    console.log(`  Unit ID: ${status.UnitId || STN1_UNIT_ID}`);
    console.log(`  Status ID: ${status.StatusId || 'Unknown'}`);
    console.log(`  Status Text: ${status.StatusText || 'Unknown'}`);
    console.log(`  Mapped Status: ${STATUS_MAPPING[status.StatusId] || 'Unknown'}`);
    
    if (status.Timestamp && status.Timestamp !== '0001-01-01T00:00:00') {
      const timestamp = new Date(status.Timestamp);
      console.log(`  Timestamp: ${timestamp.toLocaleString()}`);
    }
    
    return status;
  } catch (error) {
    console.error(`Error getting direct unit status: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Get all unit statuses
 */
async function getAllUnitStatuses(token) {
  try {
    console.log('\n===== Checking All Unit Statuses =====');
    console.log('Querying UnitStatus/GetAllUnitStatuses endpoint...');
    
    const response = await axios.get(
      `${API_BASE_URL}/UnitStatus/GetAllUnitStatuses`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No status data found');
      return null;
    }
    
    const statuses = response.data.Data;
    console.log(`Found ${statuses.length} unit statuses`);
    
    // Find STN1 in statuses
    const stn1Status = statuses.find(
      status => status.UnitId === STN1_UNIT_ID || status.UnitName === 'STN1'
    );
    
    if (stn1Status) {
      console.log('✅ FOUND STN1 in unit statuses:');
      console.log(`  Unit ID: ${stn1Status.UnitId}`);
      console.log(`  Unit Name: ${stn1Status.UnitName || 'Unknown'}`);
      console.log(`  Status ID: ${stn1Status.StatusId}`);
      console.log(`  Status Text: ${stn1Status.StatusText || 'Unknown'}`);
      console.log(`  Mapped Status: ${STATUS_MAPPING[stn1Status.StatusId] || 'Unknown'}`);
      
      if (stn1Status.Timestamp && stn1Status.Timestamp !== '0001-01-01T00:00:00') {
        const timestamp = new Date(stn1Status.Timestamp);
        console.log(`  Timestamp: ${timestamp.toLocaleString()}`);
      }
      
      return stn1Status;
    }
    
    console.log('❌ STN1 not found in unit statuses');
    return null;
  } catch (error) {
    console.error(`Error getting all unit statuses: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Check for STN1 in active calls
 */
async function getActiveCalls(token) {
  try {
    console.log('\n===== Checking Active Calls =====');
    console.log('Querying Calls/GetActiveCalls endpoint...');
    
    const response = await axios.get(
      `${API_BASE_URL}/Calls/GetActiveCalls`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No active calls found');
      return null;
    }
    
    const activeCalls = response.data.Data;
    console.log(`Found ${activeCalls.length} active calls`);
    
    let stn1Activities = [];
    
    // Look through each call for STN1
    for (const call of activeCalls) {
      console.log(`\nChecking call ${call.CallId}: ${call.Name}`);
      
      // Get extra call data to see activity information
      try {
        const extraResponse = await axios.get(
          `${API_BASE_URL}/Calls/GetCallExtraData?callId=${call.CallId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        
        if (extraResponse.data && extraResponse.data.Data) {
          const extraData = extraResponse.data.Data;
          
          // Check Activity array
          if (extraData.Activity && extraData.Activity.length > 0) {
            console.log(`  Call has ${extraData.Activity.length} activity entries`);
            
            // Find STN1 in activity
            const callStn1Activities = extraData.Activity.filter(
              act => act.UnitId === STN1_UNIT_ID || act.UnitName === 'STN1'
            );
            
            if (callStn1Activities.length > 0) {
              console.log(`  ✅ FOUND STN1 in activity array (${callStn1Activities.length} entries)`);
              
              for (const act of callStn1Activities) {
                console.log(`    Status ID: ${act.StatusId}`);
                console.log(`    Status Text: ${act.StatusText || 'Unknown'}`);
                console.log(`    Mapped Status: ${STATUS_MAPPING[act.StatusId] || 'Unknown'}`);
                
                if (act.Timestamp && act.Timestamp !== '0001-01-01T00:00:00') {
                  const timestamp = new Date(act.Timestamp);
                  console.log(`    Timestamp: ${timestamp.toLocaleString()}`);
                }
                
                stn1Activities.push({
                  callId: call.CallId,
                  callName: call.Name,
                  ...act
                });
              }
            }
          }
          
          // Check Dispatches array
          if (extraData.Dispatches && extraData.Dispatches.length > 0) {
            console.log(`  Call has ${extraData.Dispatches.length} dispatch entries`);
            
            // Find STN1 in dispatches
            const stn1Dispatches = extraData.Dispatches.filter(
              disp => disp.UnitId === STN1_UNIT_ID || disp.UnitName === 'STN1'
            );
            
            if (stn1Dispatches.length > 0) {
              console.log(`  ✅ FOUND STN1 in dispatches array (${stn1Dispatches.length} entries)`);
              
              for (const disp of stn1Dispatches) {
                console.log(`    Status ID: ${disp.StatusId || 'Unknown'}`);
                console.log(`    Status Text: ${disp.StatusText || 'Unknown'}`);
                console.log(`    Mapped Status: ${STATUS_MAPPING[disp.StatusId] || 'Unknown'}`);
                
                if (disp.Timestamp && disp.Timestamp !== '0001-01-01T00:00:00') {
                  const timestamp = new Date(disp.Timestamp);
                  console.log(`    Timestamp: ${timestamp.toLocaleString()}`);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`  Error checking call ${call.CallId}: ${error.message}`);
      }
    }
    
    if (stn1Activities.length > 0) {
      // Return most recent activity
      stn1Activities.sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
      return {
        source: 'active_calls',
        activities: stn1Activities,
        mostRecent: stn1Activities[0]
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error checking active calls: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Get status definitions
 */
async function getStatusDefinitions(token) {
  try {
    console.log('\n===== Checking Status Definitions =====');
    console.log('Querying UnitStatus/GetAllUnitStatusDefinitions endpoint...');
    
    const response = await axios.get(
      `${API_BASE_URL}/UnitStatus/GetAllUnitStatusDefinitions`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    if (!response.data || !response.data.Data) {
      console.log('No status definitions found');
      return null;
    }
    
    const definitions = response.data.Data;
    console.log(`Found ${definitions.length} status definitions:`);
    
    for (const def of definitions) {
      console.log(`  ID: ${def.StatusId}, Name: ${def.StatusName}, Text: ${def.ButtonText}`);
    }
    
    return definitions;
  } catch (error) {
    console.error(`Error getting status definitions: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
    }
    return null;
  }
}

/**
 * Run comprehensive status check
 */
async function confirmSTN1Status() {
  try {
    console.log('====================================');
    console.log('STN1 STATUS CONFIRMATION REPORT');
    console.log('====================================');
    console.log(`Unit ID: ${STN1_UNIT_ID}`);
    console.log('====================================');
    
    // Get API token
    const token = await getApiToken();
    
    // Gather data from all sources
    const unitInfo = await getUnitInfos(token);
    const directStatus = await getDirectUnitStatus(token);
    const allStatuses = await getAllUnitStatuses(token);
    const callData = await getActiveCalls(token);
    const statusDefs = await getStatusDefinitions(token);
    
    console.log('\n====================================');
    console.log('STATUS SUMMARY');
    console.log('====================================');
    
    // Determine most current status
    let currentStatus = {
      id: null,
      text: 'Unknown',
      source: 'None'
    };
    
    if (directStatus) {
      currentStatus = {
        id: directStatus.StatusId,
        text: STATUS_MAPPING[directStatus.StatusId] || directStatus.StatusText || 'Unknown',
        source: 'Direct Unit Status'
      };
    } else if (unitInfo) {
      currentStatus = {
        id: unitInfo.UnitStatusId,
        text: STATUS_MAPPING[unitInfo.UnitStatusId] || unitInfo.CurrentStatus || 'Unknown',
        source: 'Unit Infos'
      };
    } else if (allStatuses) {
      currentStatus = {
        id: allStatuses.StatusId,
        text: STATUS_MAPPING[allStatuses.StatusId] || allStatuses.StatusText || 'Unknown',
        source: 'All Unit Statuses'
      };
    } else if (callData && callData.mostRecent) {
      currentStatus = {
        id: callData.mostRecent.StatusId,
        text: STATUS_MAPPING[callData.mostRecent.StatusId] || callData.mostRecent.StatusText || 'Unknown',
        source: `Call ${callData.mostRecent.callId} (${callData.mostRecent.callName})`
      };
    }
    
    console.log(`Current Status ID: ${currentStatus.id}`);
    console.log(`Current Status Text: ${currentStatus.text}`);
    console.log(`Status Source: ${currentStatus.source}`);
    console.log('====================================');
    
    console.log('\nStatus check complete.');
  } catch (error) {
    console.error(`Error in confirmation: ${error.message}`);
  }
}

// Run the confirmation
confirmSTN1Status();