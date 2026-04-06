/**
 * Test Call 200893 - XML Generation and Field Mapping Verification
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
    console.error(`Failed to fetch call ${callId}:`, error.message);
    return null;
  }
}

function analyzeCallData(callData, extraData) {
  console.log('\n=== CALL DATA ANALYSIS ===');
  
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  console.log(`Call ID: ${call.CallId}`);
  console.log(`Name: "${call.Name}"`);
  console.log(`Type: "${call.Type}"`);
  console.log(`Nature: "${call.Nature?.substring(0, 100)}..."`);
  console.log(`Address: ${call.Address}`);
  console.log(`Logged On: ${call.LoggedOn || call.LoggedOnUtc}`);
  console.log(`Priority: ${call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Id : call.Priority) : 'None'}`);
  
  // Extract incident type
  const nature = call.Nature || '';
  let incidentType = call.Type || '';
  if (!incidentType && nature) {
    const typeMatch = nature.match(/INCIDENT TYPE:\s*([^-]+)/i);
    if (typeMatch) {
      incidentType = typeMatch[1].trim();
    }
  }
  console.log(`Extracted Incident Type: "${incidentType}"`);
  
  // Extract units
  const units = [];
  if (extra.Dispatches) {
    const unitDispatches = extra.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name) units.push(unit.Name);
    });
  }
  
  if (extraData.Data && extraData.Data.Dispatches) {
    const unitDispatches = extraData.Data.Dispatches.filter(d => d.Type === 'Unit');
    unitDispatches.forEach(unit => {
      if (unit.Name && !units.includes(unit.Name)) units.push(unit.Name);
    });
  }
  
  console.log(`Units: ${units.length > 0 ? units.join(', ') : 'None found'}`);
  console.log(`Unit Count: ${units.length}`);
  console.log(`Expected XML Structure: ${units.length > 1 ? 'Nested (Multiple Units)' : 'Flat (Single Unit)'}`);
  
  return { call, extra, units, incidentType };
}

function validateXMLGeneration(xml, units, incidentType) {
  console.log('\n=== XML VALIDATION ===');
  
  const hasXmlDeclaration = xml.includes('<?xml version="1.0"');
  const hasUnitsWrapper = xml.includes('<Units>');
  const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
  const unitElements = (xml.match(/<Unit>/g) || []).length;
  const callNature = xml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1] || '';
  const cadDispatchText = xml.match(/<CadDispatchText>(.*?)<\/CadDispatchText>/)?.[1] || '';
  
  console.log(`XML Declaration: ${hasXmlDeclaration ? 'Present' : 'Missing'}`);
  console.log(`CallNature: "${callNature}"`);
  console.log(`Expected Incident Type: "${incidentType}"`);
  console.log(`CallNature Correct: ${callNature === incidentType ? 'YES' : 'NO'}`);
  
  console.log(`\nStructure Analysis:`);
  console.log(`  Units Wrapper: ${hasUnitsWrapper ? 'Present' : 'Missing'}`);
  console.log(`  EmsUnitCallSign: ${hasEmsUnitCallSign ? 'Present' : 'Missing'}`);
  console.log(`  Unit Elements: ${unitElements}`);
  console.log(`  Expected Units: ${units.length}`);
  
  const structureCorrect = units.length > 1 ? 
    (hasUnitsWrapper && unitElements === units.length && !hasEmsUnitCallSign) :
    (!hasUnitsWrapper && hasEmsUnitCallSign && unitElements === 0);
  
  console.log(`  Structure Correct: ${structureCorrect ? 'YES' : 'NO'}`);
  console.log(`  XML Size: ${xml.length} bytes`);
  
  return {
    callNatureCorrect: callNature === incidentType,
    structureCorrect,
    callNature,
    xmlSize: xml.length
  };
}

async function main() {
  console.log('Testing Call 200893 - XML Generation and Field Mapping');
  console.log('====================================================');
  
  const token = await getResgridToken();
  if (!token) {
    console.error('Failed to authenticate with Resgrid API');
    return;
  }
  console.log('✓ Resgrid authentication successful');
  
  const callData = await fetchCallData(token, '200893');
  if (!callData) {
    console.error('Failed to fetch call data for 200893');
    return;
  }
  console.log('✓ Call data fetched successfully');
  
  const analysis = analyzeCallData(callData.call, callData.extra);
  
  const xml = generateXML(callData.call, callData.extra);
  const validation = validateXMLGeneration(xml, analysis.units, analysis.incidentType);
  
  // Save XML file
  fs.mkdirSync('test-output', { recursive: true });
  fs.writeFileSync('test-output/call-200893-test.xml', xml);
  
  console.log('\n=== TEST RESULTS ===');
  console.log(`Call ID: 200893`);
  console.log(`Units Found: ${analysis.units.length} (${analysis.units.join(', ') || 'None'})`);
  console.log(`Incident Type: "${analysis.incidentType}"`);
  console.log(`CallNature Field: "${validation.callNature}"`);
  console.log(`CallNature Mapping: ${validation.callNatureCorrect ? 'CORRECT' : 'INCORRECT'}`);
  console.log(`XML Structure: ${validation.structureCorrect ? 'CORRECT' : 'INCORRECT'}`);
  console.log(`XML Size: ${validation.xmlSize} bytes`);
  
  const overallSuccess = validation.callNatureCorrect && validation.structureCorrect;
  console.log(`\nOverall Test Result: ${overallSuccess ? 'PASSED' : 'FAILED'}`);
  
  if (overallSuccess) {
    console.log('\n✓ Call 200893 processed successfully');
    console.log('✓ CallNature correctly maps to incident type');
    console.log('✓ XML structure matches unit count');
    console.log('✓ System ready for this call type');
  } else {
    console.log('\n✗ Test failed - system requires attention');
  }
  
  console.log(`\nXML saved to: test-output/call-200893-test.xml`);
}

main().catch(error => {
  console.error('Test failed with error:', error.message);
});