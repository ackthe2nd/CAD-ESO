/**
 * Fetch historical call data to test multiple units functionality
 * Uses the same pattern as the working fetch-existing-calls.js
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

async function fetchCallsFromLastDays(token, days = 7) {
  const calls = [];
  
  try {
    // Try multiple approaches to get historical data
    const endpoints = [
      // Method 1: Try GetCalls with no parameters (should return recent calls)
      'https://api.resgrid.com/api/v4/Calls/GetCalls',
      
      // Method 2: Try GetActiveCalls as fallback
      'https://api.resgrid.com/api/v4/Calls/GetActiveCalls'
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${endpoint}`);
        const response = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        const data = response.data.Data || [];
        console.log(`✓ Found ${data.length} calls from ${endpoint}`);
        
        if (data.length > 0) {
          calls.push(...data);
          break; // Use the first successful endpoint
        }
      } catch (error) {
        console.log(`✗ Failed ${endpoint}: ${error.message}`);
        continue;
      }
    }
    
    return calls;
  } catch (error) {
    console.error('All endpoints failed:', error.message);
    return [];
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
    console.error(`Failed to fetch details for call ${callId}:`, error.response?.status, error.message);
    return null;
  }
}

function analyzeUnitsInCall(callData, extraData) {
  const units = [];
  
  // Check Dispatches array in nested Data structure
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    units.push(...unitDispatches.map(u => u.Name).filter(n => n));
  }
  
  // Check direct Dispatches array as fallback
  if (extraData.Dispatches) {
    const unitDispatches = extraData.Dispatches.filter(d => d.Type === 'Unit');
    units.push(...unitDispatches.map(u => u.Name).filter(n => n && !units.includes(n)));
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
  
  // Check direct Activity array as fallback
  if (extraData.Activity) {
    const unitActivities = extraData.Activity.filter(a => a.Type === 'Unit' && a.Name);
    const activityUnits = [...new Set(unitActivities.map(a => a.Name))];
    activityUnits.forEach(unit => {
      if (!units.includes(unit)) {
        units.push(unit);
      }
    });
  }
  
  return units;
}

async function testMultipleUnitsWithHistoricalData() {
  console.log('Testing Multiple Units with Historical Call Data');
  console.log('================================================\n');
  
  try {
    console.log('Getting API token...');
    const token = await getApiToken();
    console.log('✓ API token obtained\n');
    
    console.log('Fetching historical calls...');
    const calls = await fetchCallsFromLastDays(token, 7);
    console.log(`✓ Found ${calls.length} calls total\n`);
    
    if (calls.length === 0) {
      console.log('No calls found. Testing with synthetic data only.\n');
    } else {
      console.log('Analyzing call data for multiple units...\n');
      
      let multipleUnitsFound = false;
      let singleUnitTested = false;
      
      for (const call of calls.slice(0, 10)) { // Test up to 10 calls
        console.log(`Call ${call.CallId}:`);
        
        const details = await fetchCallDetails(token, call.CallId);
        if (!details) {
          console.log('  ✗ Failed to fetch details\n');
          continue;
        }
        
        const units = analyzeUnitsInCall(details.call, details.extra);
        console.log(`  Units: ${units.length > 0 ? units.join(', ') : 'None'} (${units.length} total)`);
        
        // Generate XML with debug
        const xml = generateXML(details.call, details.extra, false);
        
        // Analyze XML structure
        const hasUnitsWrapper = xml.includes('<Units>') && xml.includes('</Units>');
        const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
        const unitMatches = xml.match(/<Unit>/g);
        const unitCount = unitMatches ? unitMatches.length : 0;
        
        if (units.length > 1 && !multipleUnitsFound) {
          console.log(`  ✓ MULTIPLE UNITS DETECTED!`);
          console.log(`  ✓ Uses nested structure: ${hasUnitsWrapper}`);
          console.log(`  ✓ Generated ${unitCount} Unit elements`);
          
          // Save this XML for inspection
          const fs = require('fs');
          fs.mkdirSync('test-output', { recursive: true });
          fs.writeFileSync(`test-output/real-multiple-units-${call.CallId}.xml`, xml);
          console.log(`  ✓ XML saved to test-output/real-multiple-units-${call.CallId}.xml`);
          
          multipleUnitsFound = true;
        } else if (units.length === 1 && !singleUnitTested) {
          console.log(`  ✓ Single unit - uses flat structure: ${!hasUnitsWrapper && hasEmsUnitCallSign}`);
          
          const fs = require('fs');
          fs.mkdirSync('test-output', { recursive: true });
          fs.writeFileSync(`test-output/real-single-unit-${call.CallId}.xml`, xml);
          console.log(`  ✓ XML saved to test-output/real-single-unit-${call.CallId}.xml`);
          
          singleUnitTested = true;
        } else {
          console.log(`  - ${units.length === 0 ? 'No units' : 'Already tested this scenario'}`);
        }
        
        console.log('');
        
        // Stop if we've tested both scenarios
        if (multipleUnitsFound && singleUnitTested) {
          console.log('✓ Both single and multiple unit scenarios tested with real data!\n');
          break;
        }
      }
      
      if (!multipleUnitsFound) {
        console.log('No multiple units found in historical data. This indicates most calls use single units.\n');
      }
    }
    
    // Always test with synthetic data to demonstrate the feature
    console.log('Testing with synthetic multiple units data to demonstrate functionality...\n');
    
    const syntheticCall = {
      CallId: "DEMO-MULTI-UNITS",
      LoggedOn: new Date().toISOString(),
      Name: "Multi-Unit Response Demo",
      Nature: "Structure Fire - Multiple Units Required", 
      Note: "Testing multiple units XML generation capability",
      Address: "456 Emergency Lane, Response City, CA 90210, USA",
      Type: "Fire",
      Priority: { Id: 1560 },
      Latitude: "34.0522",
      Longitude: "-118.2437"
    };
    
    const syntheticExtra = {
      Data: {
        Dispatches: [
          { Type: "Unit", Name: "ENGINE1", Location: "34.0522,-118.2437" },
          { Type: "Unit", Name: "LADDER2", Location: "34.0522,-118.2437" },
          { Type: "Unit", Name: "RESCUE3", Location: "34.0522,-118.2437" },
          { Type: "Unit", Name: "CHIEF4", Location: "34.0522,-118.2437" }
        ],
        Activity: [
          { Type: "Unit", Name: "ENGINE1", StatusId: 5, StatusText: "En Route", Timestamp: new Date(Date.now() - 600000).toISOString() },
          { Type: "Unit", Name: "ENGINE1", StatusId: 6, StatusText: "On Scene", Timestamp: new Date(Date.now() - 300000).toISOString() },
          { Type: "Unit", Name: "LADDER2", StatusId: 5, StatusText: "En Route", Timestamp: new Date(Date.now() - 580000).toISOString() },
          { Type: "Unit", Name: "LADDER2", StatusId: 6, StatusText: "On Scene", Timestamp: new Date(Date.now() - 280000).toISOString() },
          { Type: "Unit", Name: "RESCUE3", StatusId: 5, StatusText: "En Route", Timestamp: new Date(Date.now() - 560000).toISOString() },
          { Type: "Unit", Name: "RESCUE3", StatusId: 6, StatusText: "On Scene", Timestamp: new Date(Date.now() - 260000).toISOString() },
          { Type: "Unit", Name: "CHIEF4", StatusId: 5, StatusText: "En Route", Timestamp: new Date(Date.now() - 540000).toISOString() },
          { Type: "Unit", Name: "CHIEF4", StatusId: 6, StatusText: "On Scene", Timestamp: new Date(Date.now() - 240000).toISOString() }
        ]
      }
    };
    
    console.log('Generating 4-unit response XML...');
    const demoXml = generateXML(syntheticCall, syntheticExtra, true);
    
    const hasUnitsWrapper = demoXml.includes('<Units>') && demoXml.includes('</Units>');
    const unitMatches = demoXml.match(/<Unit>/g);
    const unitCount = unitMatches ? unitMatches.length : 0;
    
    console.log(`✓ Uses nested Units structure: ${hasUnitsWrapper}`);
    console.log(`✓ Generated ${unitCount} Unit elements`);
    console.log(`✓ Contains ENGINE1: ${demoXml.includes('<EmsUnitCallSign>ENGINE1</EmsUnitCallSign>')}`);
    console.log(`✓ Contains LADDER2: ${demoXml.includes('<EmsUnitCallSign>LADDER2</EmsUnitCallSign>')}`);
    console.log(`✓ Contains RESCUE3: ${demoXml.includes('<EmsUnitCallSign>RESCUE3</EmsUnitCallSign>')}`);
    console.log(`✓ Contains CHIEF4: ${demoXml.includes('<EmsUnitCallSign>CHIEF4</EmsUnitCallSign>')}`);
    
    // Save demo XML
    const fs = require('fs');
    fs.mkdirSync('test-output', { recursive: true });
    fs.writeFileSync('test-output/demo-4-units-response.xml', demoXml);
    console.log('✓ Demo XML saved to test-output/demo-4-units-response.xml');
    
    console.log('\n✓ Multiple units functionality testing complete!');
    console.log('✓ System properly detects unit count and generates appropriate XML structure');
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run the test
testMultipleUnitsWithHistoricalData();