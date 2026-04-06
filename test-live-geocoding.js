/**
 * Test Live GPS Geocoding with Real Call Data
 * Fetches an active call and tests geocoding functionality
 */

require('dotenv').config();
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');

/**
 * Get Resgrid API token
 */
async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Auth/Validate', {
      Usr: process.env.RESGRID_USER,
      Pass: process.env.RESGRID_PASS
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to get token: ${error.message}`);
  }
}

/**
 * Fetch active calls
 */
async function fetchActiveCalls(token) {
  try {
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    throw new Error(`Failed to fetch calls: ${error.message}`);
  }
}

/**
 * Test geocoding with real call data by removing coordinates
 */
async function testLiveGeocoding() {
  console.log('Testing Live GPS Geocoding with Real Call Data...\n');
  
  try {
    // Get API token
    console.log('Getting Resgrid API token...');
    const token = await getResgridToken();
    
    // Fetch active calls
    console.log('Fetching active calls...');
    const calls = await fetchActiveCalls(token);
    
    if (!calls || calls.length === 0) {
      console.log('No active calls found to test with.');
      return;
    }
    
    // Use the first call for testing
    const testCall = calls[0];
    console.log(`Testing with call ${testCall.CallId}: ${testCall.Name}`);
    console.log(`Original address: ${testCall.Address}`);
    console.log(`Original coordinates: ${testCall.Latitude || 'None'}, ${testCall.Longitude || 'None'}\n`);
    
    // Test 1: Remove coordinates to force geocoding
    const callWithoutCoords = { ...testCall };
    delete callWithoutCoords.Latitude;
    delete callWithoutCoords.Longitude;
    delete callWithoutCoords.Geolocation;
    
    console.log('=== Test 1: Force Geocoding by Removing Coordinates ===');
    const xmlResult1 = await generateXML(callWithoutCoords, {}, true);
    const xml1 = typeof xmlResult1 === 'object' ? xmlResult1.xml : xmlResult1;
    
    const latMatch1 = xml1.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
    const lonMatch1 = xml1.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
    
    const geocodedLat = latMatch1 ? latMatch1[1] : 'Not found';
    const geocodedLon = lonMatch1 ? lonMatch1[1] : 'Not found';
    
    console.log(`Geocoded coordinates: ${geocodedLat}, ${geocodedLon}`);
    
    if (geocodedLat !== '' && geocodedLon !== '' && geocodedLat !== 'Not found') {
      console.log('✓ Geocoding successful - coordinates generated from address');
    } else {
      console.log('⚠ Geocoding did not produce coordinates');
    }
    
    console.log('\n=== Test 2: Use Original Coordinates (No Geocoding) ===');
    const xmlResult2 = await generateXML(testCall, {}, true);
    const xml2 = typeof xmlResult2 === 'object' ? xmlResult2.xml : xmlResult2;
    
    const latMatch2 = xml2.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
    const lonMatch2 = xml2.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
    
    const originalLat = latMatch2 ? latMatch2[1] : 'Not found';
    const originalLon = lonMatch2 ? lonMatch2[1] : 'Not found';
    
    console.log(`Original coordinates preserved: ${originalLat}, ${originalLon}`);
    
    if (originalLat === (testCall.Latitude || '') && originalLon === (testCall.Longitude || '')) {
      console.log('✓ Original coordinates preserved correctly');
    } else {
      console.log('⚠ Coordinate preservation may have issues');
    }
    
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
  }
}

// Run the test
testLiveGeocoding();