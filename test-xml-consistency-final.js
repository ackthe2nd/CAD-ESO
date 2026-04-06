/**
 * Final XML Consistency Test
 * Verify CallNature field mapping and multi-unit XML structure
 */

require('dotenv').config();
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');

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

function validateCall(callId, callData, extraData) {
  console.log(`\n=== VALIDATING CALL ${callId} ===`);
  
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  // Extract units
  const units = [];
  if (extra.Dispatches) {
    extra.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
      if (unit.Name) units.push(unit.Name);
    });
  }
  if (extraData.Data && extraData.Data.Dispatches) {
    extraData.Data.Dispatches.filter(d => d.Type === 'Unit').forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
    });
  }
  
  // Extract incident type
  const nature = call.Nature || '';
  let incidentType = call.Type || '';
  if (!incidentType && nature) {
    const typeMatch = nature.match(/INCIDENT TYPE:\s*([^-]+)/i);
    if (typeMatch) {
      incidentType = typeMatch[1].trim();
    }
  }
  
  console.log(`Call Name: "${call.Name}"`);
  console.log(`Call Type: "${call.Type}"`);
  console.log(`Extracted Incident Type: "${incidentType}"`);
  console.log(`Units Found: ${units.length} (${units.join(', ') || 'None'})`);
  
  // Generate XML
  const xml = generateXML(callData, extraData);
  
  // Validate XML structure
  const hasUnitsWrapper = xml.includes('<Units>');
  const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
  const unitElements = (xml.match(/<Unit>/g) || []).length;
  const callNature = xml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1] || '';
  
  console.log(`\nXML Analysis:`);
  console.log(`  CallNature: "${callNature}"`);
  console.log(`  Has <Units> wrapper: ${hasUnitsWrapper}`);
  console.log(`  Has <EmsUnitCallSign>: ${hasEmsUnitCallSign}`);
  console.log(`  <Unit> elements: ${unitElements}`);
  console.log(`  XML size: ${xml.length} bytes`);
  
  // Determine expected structure
  const expectedStructure = units.length > 1 ? 'nested' : 'flat';
  const actualStructure = hasUnitsWrapper ? 'nested' : 'flat';
  
  console.log(`  Expected structure: ${expectedStructure}`);
  console.log(`  Actual structure: ${actualStructure}`);
  
  const structureCorrect = expectedStructure === actualStructure;
  const callNatureCorrect = callNature === incidentType;
  
  console.log(`\nValidation Results:`);
  console.log(`  XML Structure: ${structureCorrect ? 'CORRECT' : 'INCORRECT'}`);
  console.log(`  CallNature Mapping: ${callNatureCorrect ? 'CORRECT' : 'INCORRECT'}`);
  
  return {
    callId,
    units,
    incidentType,
    xml,
    structureCorrect,
    callNatureCorrect,
    callNature,
    expectedStructure,
    actualStructure
  };
}

async function main() {
  console.log('Final XML Consistency Test');
  console.log('=========================');
  
  const token = await getResgridToken();
  
  // Test calls
  const testCalls = ['200576', '200806'];
  const results = [];
  
  for (const callId of testCalls) {
    try {
      const callData = await fetchCallData(token, callId);
      const result = validateCall(callId, callData.call, callData.extra);
      results.push(result);
      
      // Save XML file
      fs.mkdirSync('test-output', { recursive: true });
      fs.writeFileSync(`test-output/call-${callId}-final.xml`, result.xml);
      
    } catch (error) {
      console.error(`Failed to process call ${callId}:`, error.message);
    }
  }
  
  console.log('\n=== FINAL SUMMARY ===');
  
  let allCorrect = true;
  for (const result of results) {
    console.log(`\nCall ${result.callId}:`);
    console.log(`  Units: ${result.units.length} (${result.units.join(', ') || 'None'})`);
    console.log(`  CallNature: "${result.callNature}"`);
    console.log(`  Structure: ${result.actualStructure} (${result.structureCorrect ? 'correct' : 'wrong'})`);
    console.log(`  CallNature: ${result.callNatureCorrect ? 'correct' : 'wrong'}`);
    
    if (!result.structureCorrect || !result.callNatureCorrect) {
      allCorrect = false;
    }
  }
  
  console.log(`\nOverall Status: ${allCorrect ? 'ALL TESTS PASSED' : 'ISSUES DETECTED'}`);
  
  if (allCorrect) {
    console.log('\n✓ CallNature correctly maps to incident type');
    console.log('✓ Multi-unit calls use nested XML structure');
    console.log('✓ Single-unit calls use flat XML structure');
    console.log('✓ All XML generation is consistent');
  } else {
    console.log('\n✗ XML generation requires attention');
  }
  
  console.log('\nXML files saved to test-output/');
}

main().catch(error => {
  console.error('Test failed:', error.message);
});