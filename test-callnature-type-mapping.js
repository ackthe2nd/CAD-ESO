/**
 * Test Updated CallNature Field Mapping
 * Verify CallNature now maps to incident type instead of call name
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
  
  return {
    call: callResponse.data,
    extra: extraResponse.data
  };
}

function validateFieldMapping(callData, xml) {
  const call = callData.Data || callData;
  
  console.log('\n=== FIELD MAPPING VALIDATION ===');
  console.log(`Call Name: "${call.Name}"`);
  console.log(`Call Type: "${call.Type}"`);
  console.log(`Call Nature: "${call.Nature?.substring(0, 50)}..."`);
  
  // Extract XML values
  const xmlCallNature = xml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1] || 'NOT FOUND';
  const xmlCadDispatchText = xml.match(/<CadDispatchText>(.*?)<\/CadDispatchText>/)?.[1] || 'NOT FOUND';
  
  console.log('\nXML Field Values:');
  console.log(`<CallNature>: "${xmlCallNature}"`);
  console.log(`<CadDispatchText>: "${xmlCadDispatchText.substring(0, 50)}..."`);
  
  // Validate mapping
  const correctTypeMapping = xmlCallNature === (call.Type || '');
  const correctNatureMapping = xmlCadDispatchText.includes(call.Nature?.substring(0, 20) || '');
  
  console.log('\nMapping Validation:');
  console.log(`CallNature maps to Type: ${correctTypeMapping ? 'CORRECT' : 'INCORRECT'}`);
  console.log(`CadDispatchText maps to Nature: ${correctNatureMapping ? 'CORRECT' : 'INCORRECT'}`);
  
  return {
    correctTypeMapping,
    correctNatureMapping,
    xmlCallNature,
    callType: call.Type
  };
}

async function main() {
  console.log('Testing Updated CallNature Field Mapping');
  console.log('=======================================');
  
  const token = await getResgridToken();
  const callData = await fetchCallData(token, '200576');
  
  if (!callData) {
    console.error('Failed to fetch call data');
    return;
  }
  
  const xml = generateXML(callData.call, callData.extra);
  const validation = validateFieldMapping(callData.call, xml);
  
  // Save updated XML
  fs.mkdirSync('test-output', { recursive: true });
  fs.writeFileSync('test-output/call-200576-updated-mapping.xml', xml);
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`XML Generated: ${xml ? 'YES' : 'NO'}`);
  console.log(`XML Size: ${xml.length} bytes`);
  console.log(`CallNature Field: "${validation.xmlCallNature}"`);
  console.log(`Expected Type: "${validation.callType}"`);
  console.log(`Mapping Correct: ${validation.correctTypeMapping ? 'YES' : 'NO'}`);
  
  if (validation.correctTypeMapping) {
    console.log('\n✓ CallNature successfully updated to map to incident type');
    console.log('✓ Field mapping change implemented correctly');
  } else {
    console.log('\n✗ CallNature mapping issue detected');
    console.log('✗ Field mapping requires further adjustment');
  }
  
  console.log(`\nUpdated XML saved to: test-output/call-200576-updated-mapping.xml`);
}

main().catch(error => {
  console.error('Test failed:', error.message);
});