/**
 * Test multiple units XML generation using active calls data
 * This script uses the same endpoint as the main application
 */

require('dotenv').config();
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');

async function getApiToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
      grant_type: 'password',
      username: process.env.RESGRID_USER,
      password: process.env.RESGRID_PASS
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get API token:', error.message);
    throw error;
  }
}

async function fetchRecentCalls(token) {
  try {
    // Get calls from the last 7 days
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - (7 * 24 * 60 * 60 * 1000));
    
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallsForDate?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.Data || [];
  } catch (error) {
    console.error('Failed to fetch recent calls:', error.message);
    
    // Fallback to GetActiveCalls if date range fails
    try {
      const activeResponse = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      return activeResponse.data.Data || [];
    } catch (activeError) {
      console.error('Failed to fetch active calls as fallback:', activeError.message);
      return [];
    }
  }
}

async function fetchCallDetails(token, callId) {
  try {
    const [callResponse, extraResponse] = await Promise.all([
      axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
    ]);
    
    return {
      call: callResponse.data,
      extra: extraResponse.data
    };
  } catch (error) {
    console.error(`Failed to fetch details for call ${callId}:`, error.message);
    return null;
  }
}

async function createTestCall(token) {
  try {
    const testCallData = {
      Name: "Multiple Units Test Call",
      Nature: "Medical Emergency - Multiple Units Required",
      Note: "Test call for multiple units XML generation",
      Address: "123 Test Street, Test City, CA 90210",
      Type: "Medical",
      Priority: 1560, // Emergent
      ContactName: "Test Patient",
      ContactInfo: "555-123-4567"
    };

    const response = await axios.post('https://api.resgrid.com/api/v4/Calls/AddCall', testCallData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Failed to create test call:', error.message);
    return null;
  }
}

function analyzeUnitsInCall(callData, extraData) {
  const units = [];
  
  // Check Dispatches array
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    units.push(...unitDispatches.map(u => u.Name).filter(n => n));
  }
  
  // Check Activity array for additional units
  if (extraData.Data && extraData.Data.Activity) {
    const unitActivities = extraData.Data.Activity.filter(a => a.Type === 'Unit' && a.Name);
    const activityUnits = [...new Set(unitActivities.map(a => a.Name))];
    activityUnits.forEach(unit => {
      if (!units.includes(unit)) {
        units.push(unit);
      }
    });
  }
  
  return units;
}

async function testWithActiveCalls() {
  console.log('Testing Multiple Units with Historical Call Data');
  console.log('===============================================\n');
  
  try {
    console.log('Getting API token...');
    const token = await getApiToken();
    console.log('✓ API token obtained\n');
    
    console.log('Fetching recent calls (last 7 days)...');
    const recentCalls = await fetchRecentCalls(token);
    console.log(`✓ Found ${recentCalls.length} recent calls\n`);
    
    if (recentCalls.length > 0) {
      console.log('Testing with historical calls...');
      
      for (const call of recentCalls.slice(0, 5)) {
        console.log(`\nAnalyzing call ${call.CallId}:`);
        
        const details = await fetchCallDetails(token, call.CallId);
        if (!details) {
          console.log('  ✗ Failed to fetch call details');
          continue;
        }
        
        const units = analyzeUnitsInCall(details.call, details.extra);
        console.log(`  Units: ${units.length > 0 ? units.join(', ') : 'None'} (${units.length} total)`);
        
        // Generate XML
        const xml = generateXML(details.call, details.extra, true);
        
        // Analyze XML structure
        const hasUnitsWrapper = xml.includes('<Units>') && xml.includes('</Units>');
        const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
        const unitMatches = xml.match(/<Unit>/g);
        const unitCount = unitMatches ? unitMatches.length : 0;
        
        if (units.length > 1) {
          console.log(`  ✓ Multiple units - Uses nested structure: ${hasUnitsWrapper}`);
          console.log(`  ✓ Generated ${unitCount} Unit elements`);
        } else {
          console.log(`  ✓ Single/No units - Uses flat structure: ${!hasUnitsWrapper && hasEmsUnitCallSign}`);
        }
        
        // Save XML sample
        const fs = require('fs');
        fs.mkdirSync('test-output', { recursive: true });
        fs.writeFileSync(`test-output/call-${call.CallId}-${units.length}-units.xml`, xml);
        console.log(`  ✓ XML saved to test-output/call-${call.CallId}-${units.length}-units.xml`);
      }
    }
    
    // Test with synthetic multiple units data using real call structure
    console.log('\nTesting with synthetic multiple units data...');
    
    // Create a base call structure
    const baseCall = {
      CallId: "TEST-MULTI-UNITS",
      LoggedOn: new Date().toISOString(),
      Name: "Multiple Units Test",
      Nature: "Medical Emergency - Multiple Units",
      Note: "Testing multiple units XML generation",
      Address: "123 Test Street, Test City, CA 90210, USA",
      Type: "Medical",
      Priority: { Id: 1560 },
      Latitude: "34.0522",
      Longitude: "-118.2437"
    };
    
    const multipleUnitsExtra = {
      Data: {
        Dispatches: [
          {
            Type: "Unit",
            Name: "STN1",
            Location: "34.0522,-118.2437",
            EnRouteTime: new Date(Date.now() - 600000).toISOString(),
            ArrivedTime: new Date(Date.now() - 300000).toISOString()
          },
          {
            Type: "Unit", 
            Name: "BLS11",
            Location: "34.0522,-118.2437",
            EnRouteTime: new Date(Date.now() - 580000).toISOString(),
            ArrivedTime: new Date(Date.now() - 280000).toISOString()
          },
          {
            Type: "Unit",
            Name: "ALS5",
            Location: "34.0522,-118.2437",
            EnRouteTime: new Date(Date.now() - 560000).toISOString(),
            ArrivedTime: new Date(Date.now() - 260000).toISOString()
          }
        ],
        Activity: [
          {
            Type: "Unit",
            Name: "STN1",
            StatusId: 5,
            StatusText: "En Route",
            Timestamp: new Date(Date.now() - 600000).toISOString()
          },
          {
            Type: "Unit",
            Name: "STN1", 
            StatusId: 6,
            StatusText: "On Scene",
            Timestamp: new Date(Date.now() - 300000).toISOString()
          },
          {
            Type: "Unit",
            Name: "BLS11",
            StatusId: 5,
            StatusText: "En Route", 
            Timestamp: new Date(Date.now() - 580000).toISOString()
          },
          {
            Type: "Unit",
            Name: "BLS11",
            StatusId: 6,
            StatusText: "On Scene",
            Timestamp: new Date(Date.now() - 280000).toISOString()
          },
          {
            Type: "Unit",
            Name: "ALS5",
            StatusId: 5,
            StatusText: "En Route", 
            Timestamp: new Date(Date.now() - 560000).toISOString()
          },
          {
            Type: "Unit",
            Name: "ALS5",
            StatusId: 6,
            StatusText: "On Scene",
            Timestamp: new Date(Date.now() - 260000).toISOString()
          }
        ]
      }
    };
    
    console.log('Generating XML for 3-unit call...');
    const multiXml = generateXML(baseCall, multipleUnitsExtra, true);
    
    const hasUnitsWrapper = multiXml.includes('<Units>') && multiXml.includes('</Units>');
    const unitMatches = multiXml.match(/<Unit>/g);
    const unitCount = unitMatches ? unitMatches.length : 0;
    
    console.log(`✓ Uses nested Units structure: ${hasUnitsWrapper}`);
    console.log(`✓ Generated ${unitCount} Unit elements`);
    console.log(`✓ Contains STN1: ${multiXml.includes('<EmsUnitCallSign>STN1</EmsUnitCallSign>')}`);
    console.log(`✓ Contains BLS11: ${multiXml.includes('<EmsUnitCallSign>BLS11</EmsUnitCallSign>')}`);
    console.log(`✓ Contains ALS5: ${multiXml.includes('<EmsUnitCallSign>ALS5</EmsUnitCallSign>')}`);
    
    // Save the test XML
    const fs = require('fs');
    fs.mkdirSync('test-output', { recursive: true });
    fs.writeFileSync('test-output/synthetic-3-units-test.xml', multiXml);
    console.log('✓ XML saved to test-output/synthetic-3-units-test.xml');
    
    console.log('\n✓ Multiple units functionality validation complete!');
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run the test
testWithActiveCalls();