/**
 * Test GPS Geocoding Fallback Functionality
 * Verifies that addresses without GPS coordinates get geocoded automatically
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator');

/**
 * Test cases for geocoding functionality
 */
const testCases = [
  {
    name: "Address with range",
    callData: {
      CallId: "TEST001",
      Name: "Medical Emergency Test",
      LoggedOn: "2025-06-07T20:00:00Z",
      Address: "7339-7399 Romaine St, Hollywood, CA 90046",
      Priority: 1,
      Nature: "Medical Emergency"
    },
    extraData: {
      Name: "Medical Emergency Test"
    }
  },
  {
    name: "Simple address without coordinates",
    callData: {
      CallId: "TEST002",
      Name: "Fire Emergency Test",
      LoggedOn: "2025-06-07T20:05:00Z",
      Address: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
      Priority: 1,
      Nature: "Fire Emergency"
    },
    extraData: {
      Name: "Fire Emergency Test"
    }
  },
  {
    name: "Address with existing coordinates (should not geocode)",
    callData: {
      CallId: "TEST003",
      Name: "Test with coordinates",
      LoggedOn: "2025-06-07T20:10:00Z",
      Address: "123 Main St, Los Angeles, CA",
      Latitude: "34.0522",
      Longitude: "-118.2437",
      Priority: 1,
      Nature: "General Emergency"
    },
    extraData: {
      Name: "Test with coordinates"
    }
  }
];

/**
 * Run geocoding tests
 */
async function runGeocodingTests() {
  console.log('Testing GPS Geocoding Fallback Functionality...\n');
  
  for (const testCase of testCases) {
    console.log(`Testing: ${testCase.name}`);
    console.log(`Address: ${testCase.callData.Address}`);
    
    try {
      const xmlResult = await generateXML(testCase.callData, testCase.extraData, true);
      const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
      
      // Extract GPS coordinates from the generated XML
      const latMatch = xml.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
      const lonMatch = xml.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
      
      const latitude = latMatch ? latMatch[1] : 'Not found';
      const longitude = lonMatch ? lonMatch[1] : 'Not found';
      
      console.log(`Generated GPS: ${latitude}, ${longitude}`);
      
      if (latitude && longitude && latitude !== '' && longitude !== '') {
        console.log('✓ GPS coordinates generated successfully');
      } else {
        console.log('⚠ No GPS coordinates in output');
      }
      
    } catch (error) {
      console.log(`✗ Error: ${error.message}`);
    }
    
    console.log('---\n');
  }
  
  console.log('Geocoding tests completed!');
}

// Run the tests
runGeocodingTests().catch(console.error);