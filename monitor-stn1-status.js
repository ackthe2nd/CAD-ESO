/**
 * Live STN1 Status Monitoring Script
 * 
 * This script continuously monitors the status of the STN1 unit
 * and helps verify status code/text mappings in Resgrid.
 * 
 * Status Codes (from observations):
 * 5 = En Route / Responding
 * 6 = On Scene
 * 3 = Committed / At Patient
 * 8 = Returning
 * 0 = Available
 */
require('dotenv').config();
const axios = require('axios');

// Configuration
const BASE_URL = 'https://api.resgrid.com/api/v4';
const STN1_UNIT_ID = '8824'; // STN1 unit ID
const POLL_INTERVAL = 5000; // Check every 5 seconds
const MAX_HISTORY = 10; // Number of status changes to keep in history

// Status code to text mapping
const STATUS_MAPPING = {
  0: 'Available',
  2: 'Available (Alt)',
  3: 'Committed / At Patient',
  5: 'En Route / Responding',
  6: 'On Scene',
  8: 'Returning',
  9: 'Unknown (9)'
};

// Track status history
const statusHistory = [];
let currentStatus = null;
let token = null;
let startTime = new Date();
let tokenExpiration = null;

// Function to get API token
async function getApiToken() {
  try {
    console.log('Getting Resgrid API token...');
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const response = await axios.post(`${BASE_URL}/Connect/token`, 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      console.log('Successfully obtained API token');
      // Set expiration 15 minutes before actual expiration
      tokenExpiration = new Date(new Date().getTime() + (response.data.expires_in - 900) * 1000);
      return response.data.access_token;
    }
  } catch (error) {
    console.error(`Failed to get API token: ${error.message}`);
    if (error.response) {
      console.error(`Status code: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
  }
  return null;
}

// Function to check if token needs refreshing
async function ensureValidToken() {
  if (!token || new Date() >= tokenExpiration) {
    token = await getApiToken();
    if (!token) {
      throw new Error('Could not obtain API token');
    }
  }
  return token;
}

// Function to get STN1 status directly
async function getSTN1Status() {
  try {
    const currentToken = await ensureValidToken();
    const url = `${BASE_URL}/UnitStatus/GetUnitStatus?unitId=${STN1_UNIT_ID}`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      const unitData = response.data.Data;
      return {
        unitId: unitData.UnitId,
        name: unitData.Name,
        state: unitData.State,
        stateId: unitData.StateId, // May be undefined
        timestamp: unitData.Timestamp,
        note: unitData.Note,
        lat: unitData.Latitude,
        lng: unitData.Longitude
      };
    }
  } catch (error) {
    console.error(`Error getting STN1 status: ${error.message}`);
  }
  
  return null;
}

// Function to check for STN1 in active calls
async function checkActiveCalls() {
  try {
    const currentToken = await ensureValidToken();
    const response = await axios.get(`${BASE_URL}/Calls/GetActiveCalls`, {
      headers: {
        'Authorization': `Bearer ${currentToken}`,
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Found ${response.data.Data.length} active calls`);
      
      for (const call of response.data.Data) {
        // Get call extra data to check for STN1 activities
        const extraDataResponse = await axios.get(`${BASE_URL}/Calls/GetCallExtraData?callId=${call.CallId}`, {
          headers: {
            'Authorization': `Bearer ${currentToken}`,
            'Accept': 'application/json'
          }
        });
        
        if (extraDataResponse.data && extraDataResponse.data.Data) {
          const extraData = extraDataResponse.data.Data;
          
          // Check Activities array for STN1
          if (extraData.Activity && Array.isArray(extraData.Activity)) {
            const stn1Activities = extraData.Activity.filter(a => 
              a.ResourceName && a.ResourceName.includes('STN1')
            );
            
            if (stn1Activities.length > 0) {
              // Sort activities by timestamp (newest first)
              stn1Activities.sort((a, b) => 
                new Date(b.Timestamp) - new Date(a.Timestamp)
              );
              
              const latestActivity = stn1Activities[0];
              console.log(`STN1 found in call ${call.CallId} (${call.Name})`);
              console.log(`  Latest activity: StatusId ${latestActivity.StatusId} at ${latestActivity.Timestamp}`);
              
              return {
                callId: call.CallId,
                callName: call.Name,
                statusId: latestActivity.StatusId,
                state: STATUS_MAPPING[latestActivity.StatusId] || `Unknown (${latestActivity.StatusId})`,
                timestamp: latestActivity.Timestamp,
                source: 'activity'
              };
            }
          }
          
          // Check Dispatches array for STN1
          if (extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
            const stn1Dispatches = extraData.Dispatches.filter(d => 
              d.ResourceName && d.ResourceName.includes('STN1')
            );
            
            if (stn1Dispatches.length > 0) {
              console.log(`STN1 found in dispatches for call ${call.CallId} (${call.Name})`);
              // Don't return dispatch data as it's less reliable for status
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error checking active calls: ${error.message}`);
  }
  
  return null;
}

// Function to log status change
function logStatusChange(newStatus) {
  if (!newStatus) return;
  
  const now = new Date();
  const runtime = ((now - startTime) / 1000).toFixed(0);
  
  // Check if status has changed
  if (!currentStatus || 
      newStatus.state !== currentStatus.state || 
      newStatus.statusId !== currentStatus.statusId) {
    
    // Format status text
    let statusText;
    if (newStatus.statusId) {
      statusText = `${newStatus.state} (StatusId: ${newStatus.statusId})`;
    } else {
      statusText = newStatus.state;
    }
    
    // Add timestamp
    const timestamp = new Date(newStatus.timestamp || now).toLocaleTimeString();
    
    // Log the change
    console.log(`\n[${runtime}s] 🚑 STN1 STATUS CHANGE: ${statusText}`);
    console.log(`  Timestamp: ${timestamp}`);
    if (newStatus.callId) {
      console.log(`  Call: ${newStatus.callId} - ${newStatus.callName}`);
    }
    if (newStatus.lat && newStatus.lng) {
      console.log(`  Location: ${newStatus.lat}, ${newStatus.lng}`);
    }
    if (newStatus.note) {
      console.log(`  Note: ${newStatus.note}`);
    }
    
    // Add to history
    statusHistory.unshift({
      timestamp: now,
      state: newStatus.state,
      statusId: newStatus.statusId,
      callId: newStatus.callId,
      source: newStatus.source
    });
    
    // Trim history if needed
    if (statusHistory.length > MAX_HISTORY) {
      statusHistory.pop();
    }
    
    // Update current status
    currentStatus = newStatus;
    
    // Print status history
    console.log('\nStatus History:');
    statusHistory.forEach((status, index) => {
      const time = status.timestamp.toLocaleTimeString();
      const statusText = status.statusId ? 
        `${status.state} (${status.statusId})` : status.state;
      console.log(`  ${index + 1}. ${time} - ${statusText}`);
    });
  } else {
    // Status unchanged - just print a quiet update
    process.stdout.write('.');
  }
}

// Main monitoring function
async function monitorSTN1Status() {
  console.log('🚑 Starting STN1 status monitoring...');
  console.log('Press Ctrl+C to stop monitoring');
  console.log(`Polling every ${POLL_INTERVAL / 1000} seconds`);
  
  // Initial status check
  console.log('\nChecking initial status...');
  const initialStatus = await getSTN1Status();
  if (initialStatus) {
    console.log(`STN1 current status: ${initialStatus.state}`);
    logStatusChange(initialStatus);
  } else {
    console.log('Could not determine initial STN1 status');
  }
  
  // Start continuous monitoring
  setInterval(async () => {
    try {
      // Check direct status first
      const directStatus = await getSTN1Status();
      
      if (directStatus) {
        logStatusChange(directStatus);
      } else {
        // If direct status failed, check in active calls
        const callStatus = await checkActiveCalls();
        
        if (callStatus) {
          logStatusChange(callStatus);
        }
      }
    } catch (error) {
      console.error(`Monitoring error: ${error.message}`);
    }
  }, POLL_INTERVAL);
}

// Start monitoring
monitorSTN1Status().catch(console.error);