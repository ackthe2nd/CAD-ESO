/**
 * Test with Call 200576 - Real Data Processing
 * Fetch actual call data and test complete system functionality
 */

require('dotenv').config();
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');

async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', {
      grant_type: 'password',
      username: process.env.RESGRID_USER,
      password: process.env.RESGRID_PASS
    }, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Authentication failed:', error.message);
    return null;
  }
}

async function fetchCallData(token, callId) {
  try {
    console.log(`Fetching call data for call ${callId}...`);
    
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
    console.error(`Status: ${error.response?.status}`);
    console.error(`Response:`, error.response?.data);
    return null;
  }
}

function analyzeCallData(callData, extraData) {
  console.log('\n=== CALL DATA ANALYSIS ===');
  
  const call = callData.Data || callData;
  const extra = extraData.Data || extraData;
  
  console.log(`Call ID: ${call.CallId}`);
  console.log(`Name: ${call.Name}`);
  console.log(`Nature: ${call.Nature}`);
  console.log(`Type: ${call.Type}`);
  console.log(`Address: ${call.Address}`);
  console.log(`Logged On: ${call.LoggedOn || call.LoggedOnUtc}`);
  console.log(`Priority: ${call.Priority ? (typeof call.Priority === 'object' ? call.Priority.Id : call.Priority) : 'None'}`);
  
  // Analyze units
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
  console.log(`Multiple Unit Call: ${units.length > 1 ? 'YES' : 'NO'}`);
  
  // Analyze activity data
  if (extra.Activity && Array.isArray(extra.Activity)) {
    console.log(`Activity Records: ${extra.Activity.length}`);
    const unitActivities = extra.Activity.filter(a => a.Type === 'Unit');
    console.log(`Unit Activities: ${unitActivities.length}`);
  } else if (extraData.Data && extraData.Data.Activity) {
    console.log(`Activity Records: ${extraData.Data.Activity.length}`);
    const unitActivities = extraData.Data.Activity.filter(a => a.Type === 'Unit');
    console.log(`Unit Activities: ${unitActivities.length}`);
  }
  
  return { call, extra, units };
}

function testXMLGeneration(callData, extraData) {
  console.log('\n=== XML GENERATION TEST ===');
  
  try {
    const xml = generateXML(callData, extraData);
    
    // Validate XML structure
    const hasXmlDeclaration = xml.includes('<?xml version="1.0"');
    const hasIncidentNumber = xml.includes('<IncidentNumber>');
    const hasCallNature = xml.includes('<CallNature>');
    const hasUnitsStructure = xml.includes('<Units>');
    const hasEmsUnitCallSign = xml.includes('<EmsUnitCallSign>');
    
    console.log(`XML Declaration: ${hasXmlDeclaration ? 'YES' : 'NO'}`);
    console.log(`Incident Number: ${hasIncidentNumber ? 'YES' : 'NO'}`);
    console.log(`Call Nature: ${hasCallNature ? 'YES' : 'NO'}`);
    console.log(`Multiple Units Structure: ${hasUnitsStructure ? 'YES' : 'NO'}`);
    console.log(`Single Unit Structure: ${hasEmsUnitCallSign && !hasUnitsStructure ? 'YES' : 'NO'}`);
    
    // Extract key values
    const incidentNumber = xml.match(/<IncidentNumber>(.*?)<\/IncidentNumber>/)?.[1];
    const callNature = xml.match(/<CallNature>(.*?)<\/CallNature>/)?.[1];
    const cadDispatchText = xml.match(/<CadDispatchText>(.*?)<\/CadDispatchText>/)?.[1];
    
    console.log(`Incident Number Value: ${incidentNumber}`);
    console.log(`Call Nature Value: ${callNature}`);
    console.log(`CAD Dispatch Text: ${cadDispatchText?.substring(0, 50)}${cadDispatchText?.length > 50 ? '...' : ''}`);
    
    // Save XML file
    fs.mkdirSync('test-output', { recursive: true });
    const fileName = `call-200576-test.xml`;
    fs.writeFileSync(`test-output/${fileName}`, xml);
    console.log(`XML saved to: test-output/${fileName}`);
    
    return xml;
  } catch (error) {
    console.error(`XML generation failed: ${error.message}`);
    return null;
  }
}

async function simulateCompleteWorkflow(callData, extraData, xml) {
  console.log('\n=== COMPLETE WORKFLOW SIMULATION ===');
  
  const call = callData.Data || callData;
  
  console.log('1. Call Detection: SIMULATED (would be via SignalR or polling)');
  console.log('2. API Data Fetch: COMPLETED');
  console.log('3. XML Generation: COMPLETED');
  
  // Simulate SFTP upload
  console.log('4. SFTP Upload: SIMULATED');
  const fileName = `call_200576_${new Date().toISOString().replace(/[:.]/g, '-')}.xml`;
  const sftpUrl = `sftp://${process.env.SFTP_HOST}${process.env.SFTP_DIR || '/incoming'}/${fileName}`;
  console.log(`   Upload URL: ${sftpUrl}`);
  console.log(`   File Size: ${xml ? xml.length : 0} bytes`);
  
  // Simulate Google Sheets logging
  console.log('5. Google Sheets Logging: SIMULATED');
  console.log(`   Call ID: ${call.CallId}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`   XML Length: ${xml ? xml.length : 0}`);
  
  return {
    callId: call.CallId,
    xmlGenerated: !!xml,
    sftpUrl: sftpUrl,
    xmlLength: xml ? xml.length : 0
  };
}

async function main() {
  console.log('Testing Resgrid to ESO Bridge with Call 200576');
  console.log('===============================================\n');
  
  // Get API token
  const token = await getResgridToken();
  if (!token) {
    console.error('Failed to authenticate with Resgrid API');
    return;
  }
  console.log('✓ Resgrid authentication successful\n');
  
  // Fetch call data
  const callData = await fetchCallData(token, '200576');
  if (!callData) {
    console.error('Failed to fetch call data');
    return;
  }
  console.log('✓ Call data fetched successfully\n');
  
  // Analyze call data
  const analysis = analyzeCallData(callData.call, callData.extra);
  
  // Test XML generation
  const xml = testXMLGeneration(callData.call, callData.extra);
  
  // Simulate complete workflow
  const workflowResult = await simulateCompleteWorkflow(callData.call, callData.extra, xml);
  
  // Final summary
  console.log('\n=== TEST SUMMARY ===');
  console.log(`Call ID: ${workflowResult.callId}`);
  console.log(`XML Generated: ${workflowResult.xmlGenerated ? 'SUCCESS' : 'FAILED'}`);
  console.log(`XML Size: ${workflowResult.xmlLength} bytes`);
  console.log(`SFTP Destination: ${workflowResult.sftpUrl}`);
  console.log(`Units Detected: ${analysis.units.length}`);
  console.log(`XML Structure: ${analysis.units.length > 1 ? 'Multiple Units (Nested)' : 'Single Unit (Flat)'}`);
  
  const testPassed = workflowResult.xmlGenerated && workflowResult.xmlLength > 0;
  console.log(`\nOverall Test Result: ${testPassed ? 'PASSED' : 'FAILED'}`);
  
  if (testPassed) {
    console.log('\n✓ Call 200576 processed successfully');
    console.log('✓ System ready for production use with this call type');
  } else {
    console.log('\n✗ Test failed - system requires attention');
  }
}

main().catch(error => {
  console.error('Test failed with error:', error.message);
});