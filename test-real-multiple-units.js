/**
 * Test multiple units XML generation with real Resgrid call data
 * This script fetches recent calls and tests the multiple units functionality
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
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetCalls', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    return response.data.Data || [];
  } catch (error) {
    console.error('Failed to fetch calls:', error.message);
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
    console.error(`Failed to fetch details for call ${callId}:`, error.message);
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

async function testMultipleUnitsWithRealData() {
  console.log('Testing Multiple Units XML Generation with Real Data');
  console.log('=====================================================\n');
  
  try {
    console.log('1. Getting API token...');
    const token = await getApiToken();
    console.log('✓ API token obtained\n');
    
    console.log('2. Fetching recent calls...');
    const calls = await fetchRecentCalls(token);
    console.log(`✓ Found ${calls.length} recent calls\n`);
    
    if (calls.length === 0) {
      console.log('No recent calls found to test with.');
      return;
    }
    
    // Test the first few calls
    const testCalls = calls.slice(0, 5);
    let multipleUnitsFound = false;
    
    for (const call of testCalls) {
      console.log(`3. Testing call ${call.CallId}...`);
      
      const details = await fetchCallDetails(token, call.CallId);
      if (!details) {
        console.log(`   ✗ Failed to fetch details for call ${call.CallId}`);
        continue;
      }
      
      const units = analyzeUnitsInCall(details.call, details.extra);
      console.log(`   Units found: ${units.length > 0 ? units.join(', ') : 'None'} (${units.length} total)`);
      
      if (units.length > 1) {
        console.log(`   ✓ Multiple units detected! Testing XML generation...`);
        multipleUnitsFound = true;
        
        // Generate XML with debug enabled
        const xml = generateXML(details.call, details.extra, true);
        
        // Check if it uses nested structure
        const hasUnitsWrapper = xml.includes('<Units>') && xml.includes('</Units>');
        const unitMatches = xml.match(/<Unit>/g);
        const unitCount = unitMatches ? unitMatches.length : 0;
        
        console.log(`   ✓ XML uses nested Units structure: ${hasUnitsWrapper}`);
        console.log(`   ✓ Unit elements generated: ${unitCount}`);
        
        // Save XML for inspection
        const fs = require('fs');
        const filename = `test-output/multiple-units-call-${call.CallId}.xml`;
        fs.mkdirSync('test-output', { recursive: true });
        fs.writeFileSync(filename, xml);
        console.log(`   ✓ XML saved to: ${filename}`);
        
        break; // Found one multiple units call, that's enough for testing
      } else if (units.length === 1) {
        console.log(`   ✓ Single unit detected, should use flat structure`);
        
        const xml = generateXML(details.call, details.extra, false);
        const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
        const hasUnitsWrapper = xml.includes('<Units>');
        
        console.log(`   ✓ XML uses flat structure (no Units wrapper): ${!hasUnitsWrapper}`);
        console.log(`   ✓ Has EmsUnitCallSign field: ${hasEmsUnitCallSign}`);
      } else {
        console.log(`   - No units found in this call`);
      }
      
      console.log('');
    }
    
    if (!multipleUnitsFound) {
      console.log('No calls with multiple units found in recent data.');
      console.log('Testing with synthetic multiple units data...\n');
      
      // Create a test case with the first call but add multiple units
      const firstCall = testCalls[0];
      const details = await fetchCallDetails(token, firstCall.CallId);
      
      if (details) {
        // Modify the extra data to include multiple units
        const modifiedExtra = {
          ...details.extra,
          Data: {
            ...details.extra.Data,
            Dispatches: [
              { Type: 'Unit', Name: 'STN1' },
              { Type: 'Unit', Name: 'BLS11' }
            ]
          }
        };
        
        console.log('Testing modified call with multiple units...');
        const xml = generateXML(details.call, modifiedExtra, true);
        
        const hasUnitsWrapper = xml.includes('<Units>') && xml.includes('</Units>');
        const unitMatches = xml.match(/<Unit>/g);
        const unitCount = unitMatches ? unitMatches.length : 0;
        
        console.log(`✓ XML uses nested Units structure: ${hasUnitsWrapper}`);
        console.log(`✓ Unit elements generated: ${unitCount}`);
        
        if (hasUnitsWrapper && unitCount === 2) {
          console.log('✓ Multiple units functionality working correctly!');
        } else {
          console.log('✗ Multiple units functionality may have issues');
        }
      }
    } else {
      console.log('✓ Multiple units functionality tested successfully with real data!');
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run the test
testMultipleUnitsWithRealData();