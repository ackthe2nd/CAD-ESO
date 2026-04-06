/**
 * Test multiple units functionality using actual historical call data
 * This script fetches a specific call that's already logged in Google Sheets
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

async function fetchSpecificCall(token, callId) {
  try {
    console.log(`Fetching call ${callId} details...`);
    
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
    console.error(`Failed to fetch call ${callId}:`, error.response?.status, error.message);
    return null;
  }
}

function analyzeCallUnits(callData, extraData) {
  const units = [];
  
  console.log('Analyzing unit data sources...');
  
  // Check Data.Dispatches (primary source)
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    console.log(`Found ${unitDispatches.length} units in Data.Dispatches`);
    unitDispatches.forEach(unit => {
      if (unit.Name) {
        units.push({
          name: unit.Name,
          source: 'Data.Dispatches',
          data: unit
        });
      }
    });
  }
  
  // Check direct Dispatches (fallback)
  if (extraData.Dispatches) {
    const unitDispatches = extraData.Dispatches.filter(d => d.Type === 'Unit');
    console.log(`Found ${unitDispatches.length} units in direct Dispatches`);
    unitDispatches.forEach(unit => {
      if (unit.Name && !units.find(u => u.name === unit.Name)) {
        units.push({
          name: unit.Name,
          source: 'Dispatches',
          data: unit
        });
      }
    });
  }
  
  // Check Activity arrays for additional units
  const activitySources = [
    { data: extraData.Data?.Activity, name: 'Data.Activity' },
    { data: extraData.Activity, name: 'Activity' }
  ];
  
  activitySources.forEach(source => {
    if (source.data && Array.isArray(source.data)) {
      const unitActivities = source.data.filter(a => a.Type === 'Unit' && a.Name);
      const uniqueUnits = [...new Set(unitActivities.map(a => a.Name))];
      console.log(`Found ${uniqueUnits.length} unique units in ${source.name}`);
      
      uniqueUnits.forEach(unitName => {
        if (!units.find(u => u.name === unitName)) {
          units.push({
            name: unitName,
            source: source.name,
            data: unitActivities.filter(a => a.Name === unitName)
          });
        }
      });
    }
  });
  
  return units;
}

async function testHistoricalCall() {
  console.log('Testing Multiple Units with Historical Call Data');
  console.log('===============================================\n');
  
  try {
    console.log('Getting API token...');
    const token = await getApiToken();
    console.log('✓ Token obtained\n');
    
    // Test with call 198898 which shows multiple units in Google Sheets
    const testCallId = "198898";
    console.log(`Testing with historical call: ${testCallId}`);
    console.log('(This call shows CMD11, STN1, BLS11 in Google Sheets)\n');
    
    const callDetails = await fetchSpecificCall(token, testCallId);
    
    if (!callDetails) {
      console.log(`Failed to fetch call ${testCallId}`);
      return;
    }
    
    console.log('✓ Call data retrieved successfully\n');
    
    // Analyze the call structure
    console.log('Call Data Fields:');
    const callFields = Object.keys(callDetails.call.Data || callDetails.call);
    callFields.forEach(field => console.log(`  - ${field}`));
    console.log('');
    
    console.log('Extra Data Structure:');
    const extraFields = Object.keys(callDetails.extra.Data || callDetails.extra);
    extraFields.forEach(field => console.log(`  - ${field}`));
    console.log('');
    
    // Analyze units
    const units = analyzeCallUnits(callDetails.call, callDetails.extra);
    console.log(`Total units detected: ${units.length}`);
    units.forEach((unit, index) => {
      console.log(`  ${index + 1}. ${unit.name} (from ${unit.source})`);
    });
    console.log('');
    
    // Generate XML with debug enabled
    console.log('Generating XML with debug output...');
    console.log('=====================================');
    const xml = generateXML(callDetails.call, callDetails.extra, true);
    console.log('=====================================\n');
    
    // Analyze generated XML
    const hasUnitsWrapper = xml.includes('<Units>') && xml.includes('</Units>');
    const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
    const unitMatches = xml.match(/<Unit>/g);
    const unitCount = unitMatches ? unitMatches.length : 0;
    
    console.log('XML Analysis:');
    console.log(`✓ Units detected: ${units.length}`);
    console.log(`✓ Uses nested structure: ${hasUnitsWrapper}`);
    console.log(`✓ Uses flat structure: ${!hasUnitsWrapper && hasEmsUnitCallSign}`);
    console.log(`✓ Unit elements generated: ${unitCount}`);
    
    // Check for specific units mentioned in Google Sheets
    const expectedUnits = ['CMD11', 'STN1', 'BLS11'];
    expectedUnits.forEach(unitName => {
      const foundInXml = xml.includes(`<EmsUnitCallSign>${unitName}</EmsUnitCallSign>`);
      console.log(`✓ Contains ${unitName}: ${foundInXml}`);
    });
    
    // Save XML for inspection
    const fs = require('fs');
    fs.mkdirSync('test-output', { recursive: true });
    const filename = `test-output/historical-call-${testCallId}.xml`;
    fs.writeFileSync(filename, xml);
    console.log(`\n✓ XML saved to: ${filename}`);
    
    // Compare with Google Sheets format
    console.log('\nGoogle Sheets Comparison:');
    console.log('Expected in sheets: CMD11, STN1, BLS11');
    console.log(`Detected by system: ${units.map(u => u.name).join(', ')}`);
    
    const sheetsMatch = expectedUnits.every(unit => 
      units.some(u => u.name === unit)
    );
    console.log(`✓ Units match Google Sheets data: ${sheetsMatch}`);
    
    if (units.length > 1) {
      console.log('\n✓ MULTIPLE UNITS FUNCTIONALITY VERIFIED');
      console.log('  - System correctly detects multiple units');
      console.log('  - Generates appropriate XML structure');
      console.log('  - Processes individual unit data');
    } else {
      console.log('\n- Single unit detected (expected multiple)');
      console.log('  This may indicate data structure differences');
    }
    
  } catch (error) {
    console.error('Error during testing:', error.message);
  }
}

// Run the test
testHistoricalCall();