/**
 * Debug GPS Coordinates in Call Data
 * Check why latitude and longitude aren't being populated
 */

require('dotenv').config();
const axios = require('axios');

async function getResgridToken() {
  const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
    grant_type: 'password',
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS
  }, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  
  return response.data.access_token;
}

async function fetchCallData(token, callId) {
  const [callResponse, extraResponse] = await Promise.all([
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }),
    axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
  ]);
  
  return { call: callResponse.data, extra: extraResponse.data };
}

function analyzeGPSData(callData, extraData) {
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  console.log('=== GPS COORDINATES ANALYSIS ===');
  console.log('\nCall Data GPS Fields:');
  console.log('  Latitude:', call.Latitude || 'NOT FOUND');
  console.log('  Longitude:', call.Longitude || 'NOT FOUND');
  console.log('  Geolocation:', call.Geolocation || 'NOT FOUND');
  console.log('  GeoLocation:', call.GeoLocation || 'NOT FOUND');
  
  console.log('\nExtra Data GPS Fields:');
  console.log('  Latitude:', extra.Latitude || 'NOT FOUND');
  console.log('  Longitude:', extra.Longitude || 'NOT FOUND');
  console.log('  Geolocation:', extra.Geolocation || 'NOT FOUND');
  console.log('  GeoLocation:', extra.GeoLocation || 'NOT FOUND');
  
  console.log('\nAddress Information:');
  console.log('  Address:', call.Address || 'NOT FOUND');
  console.log('  What3Words:', call.What3Words || 'NOT FOUND');
  
  console.log('\nAll Call Data Fields:');
  Object.keys(call).forEach(key => {
    if (key.toLowerCase().includes('lat') || key.toLowerCase().includes('lon') || 
        key.toLowerCase().includes('geo') || key.toLowerCase().includes('coord')) {
      console.log(`  ${key}:`, call[key]);
    }
  });
  
  console.log('\nAll Extra Data Fields:');
  Object.keys(extra).forEach(key => {
    if (key.toLowerCase().includes('lat') || key.toLowerCase().includes('lon') || 
        key.toLowerCase().includes('geo') || key.toLowerCase().includes('coord')) {
      console.log(`  ${key}:`, extra[key]);
    }
  });
  
  // Check for nested location data
  if (extra.Dispatches) {
    console.log('\nDispatches GPS Data:');
    extra.Dispatches.forEach((dispatch, index) => {
      if (dispatch.Latitude || dispatch.Longitude) {
        console.log(`  Dispatch ${index}:`, {
          Latitude: dispatch.Latitude,
          Longitude: dispatch.Longitude
        });
      }
    });
  }
  
  if (extra.Activity) {
    console.log('\nActivity GPS Data:');
    extra.Activity.forEach((activity, index) => {
      if (activity.Latitude || activity.Longitude || activity.Location) {
        console.log(`  Activity ${index}:`, {
          Latitude: activity.Latitude,
          Longitude: activity.Longitude,
          Location: activity.Location
        });
      }
    });
  }
}

async function main() {
  console.log('Debugging GPS Coordinates in Call Data');
  console.log('=====================================\n');
  
  try {
    const token = await getResgridToken();
    
    // Check multiple calls for GPS data
    const testCalls = ['200893', '200576'];
    
    for (const callId of testCalls) {
      console.log(`\n--- ANALYZING CALL ${callId} ---`);
      
      const callData = await fetchCallData(token, callId);
      analyzeGPSData(callData.call, callData.extra);
    }
    
  } catch (error) {
    console.error('GPS analysis failed:', error.message);
  }
}

main();