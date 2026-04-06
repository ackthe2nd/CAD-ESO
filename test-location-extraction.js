/**
 * Test Location Column Extraction
 * Test the extractLocationFromIncidentDetails function with real call data
 */

require('dotenv').config();
const axios = require('axios');

/**
 * Extract location data from Incident Details field
 * @param {string} incidentDetails - The incident details text
 * @returns {string} Extracted location or empty string
 */
function extractLocationFromIncidentDetails(incidentDetails) {
  if (!incidentDetails || typeof incidentDetails !== 'string') {
    return '';
  }
  
  try {
    // Look for "LOCATION:" followed by location data
    const locationMatch = incidentDetails.match(/LOCATION:\s*([^\n\r]+)/i);
    
    if (locationMatch && locationMatch[1]) {
      // Clean up the location text - remove extra whitespace and trim
      let location = locationMatch[1].trim();
      
      // Remove any trailing punctuation or common suffixes
      location = location.replace(/[.,;]+$/, '').trim();
      
      // If location is too short or just whitespace, return empty
      if (location.length < 3) {
        return '';
      }
      
      return location;
    }
    
    return '';
  } catch (error) {
    console.log(`Location extraction failed for incident details: ${error.message}`);
    return '';
  }
}

async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Auth/Login', {
      Username: process.env.RESGRID_USER,
      Password: process.env.RESGRID_PASS
    });
    
    if (response.data && response.data.Data) {
      return response.data.Data;
    }
    throw new Error('No token received from Resgrid');
  } catch (error) {
    console.error('Failed to get Resgrid token:', error.message);
    return null;
  }
}

async function testLocationExtraction() {
  console.log('🧪 Testing Location Column Extraction...\n');
  
  const token = await getResgridToken();
  if (!token) {
    console.log('❌ Failed to get API token');
    return;
  }
  
  try {
    // Get active calls to test with real data
    const activeCalls = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (activeCalls.data && activeCalls.data.Data && activeCalls.data.Data.length > 0) {
      console.log(`📋 Found ${activeCalls.data.Data.length} active calls to test\n`);
      
      for (const call of activeCalls.data.Data) {
        console.log(`🚨 Call ID: ${call.CallId}`);
        console.log(`📝 Call Name: ${call.Name}`);
        
        // Get extra data for this call
        const extraData = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${call.CallId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (extraData.data && extraData.data.Data) {
          const nature = extraData.data.Data.Nature || '';
          console.log(`📄 Incident Details: ${nature.substring(0, 200)}${nature.length > 200 ? '...' : ''}`);
          
          // Test location extraction
          const extractedLocation = extractLocationFromIncidentDetails(nature);
          console.log(`📍 Extracted Location: "${extractedLocation}"`);
          
          if (extractedLocation) {
            console.log(`✅ Successfully extracted location!`);
          } else {
            console.log(`ℹ️  No LOCATION: field found in incident details`);
          }
        }
        
        console.log('─'.repeat(60));
      }
    } else {
      console.log('ℹ️  No active calls found. Testing with sample data...\n');
      
      // Test with sample data containing LOCATION: field
      const testCases = [
        {
          name: 'Sample with LOCATION field',
          nature: 'Medical emergency reported at the venue. LOCATION: Section A, Row 15, Seat 120. Patient is conscious and breathing.'
        },
        {
          name: 'Sample with multiple fields',
          nature: 'Fire alarm activation. LOCATION: Building 2, Floor 3, Room 305. False alarm confirmed by security.'
        },
        {
          name: 'Sample without LOCATION field',
          nature: 'Medical emergency reported. Patient has chest pain and difficulty breathing.'
        },
        {
          name: 'Sample with LOCATION at end',
          nature: 'Security incident reported by staff. Multiple people involved. LOCATION: Main entrance, Gate B'
        }
      ];
      
      for (const testCase of testCases) {
        console.log(`🧪 Test: ${testCase.name}`);
        console.log(`📄 Nature: ${testCase.nature}`);
        
        const extractedLocation = extractLocationFromIncidentDetails(testCase.nature);
        console.log(`📍 Extracted Location: "${extractedLocation}"`);
        console.log('─'.repeat(60));
      }
    }
    
  } catch (error) {
    console.error('Error testing location extraction:', error.message);
  }
}

async function main() {
  await testLocationExtraction();
  console.log('\n🎉 Location extraction testing complete!');
}

if (require.main === module) {
  main();
}