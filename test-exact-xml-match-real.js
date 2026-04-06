/**
 * Test script to verify our fixed XML generator with real call data
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { getApiToken } = require('./src/token-manager');
const { generateXML } = require('./src/xml-generator'); // Use the main production generator

async function main() {
  try {
    console.log('Fetching real call data...');
    
    // Get a token for the Resgrid API
    const token = await getApiToken();
    
    // Get active calls
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.Data || !response.data.Data.length) {
      console.log('No active calls found. Using mock data instead.');
      return testWithMockData();
    }
    
    // Use the most recent call
    const call = response.data.Data[0];
    console.log(`Using call ID ${call.CallId}: ${call.Name}`);
    
    // Get extra data
    const extraDataResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
      params: { callId: call.CallId },
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Combine the data
    const combinedData = {
      GetCall: {
        Data: call
      },
      GetCallExtraData: extraDataResponse.data
    };
    
    // Generate XML
    const xml = generateXML(combinedData);
    
    // Save to file
    const outputPath = path.join(__dirname, 'logs', `real_call_${call.CallId}_production.xml`);
    fs.writeFileSync(outputPath, xml);
    
    console.log('\nGenerated XML summary:');
    console.log(`- XML size: ${xml.length} characters`);
    console.log(`- Contains Guid: ${xml.includes('<Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>') ? 'Yes' : 'No'}`);
    console.log(`- Contains IncidentAddress1: ${xml.includes('<IncidentAddress1>') ? 'Yes' : 'No'}`);
    console.log(`- Patient fields: ${xml.includes('<PatientFirstName>') ? 'Yes' : 'No'}`);
    console.log(`\nXML saved to: ${outputPath}`);
    
    // Validate XML structure
    validateXml(xml);
    
    // Also generate with the fixed exact match generator
    testExactMatchGenerator(combinedData);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

function testExactMatchGenerator(callData) {
  try {
    console.log('\nTesting with exact match generator...');
    
    // Import the exact match generator
    const { generateXML: generateExactMatchXML } = require('./src/xml-generator-exact-match');
    
    // Generate XML
    const xml = generateExactMatchXML(callData);
    
    // Save to file
    const callId = callData.GetCall.Data.CallId;
    const outputPath = path.join(__dirname, 'logs', `real_call_${callId}_exact_match.xml`);
    fs.writeFileSync(outputPath, xml);
    
    console.log('\nGenerated XML with exact match generator:');
    console.log(`- XML size: ${xml.length} characters`);
    console.log(`- Contains Guid: ${xml.includes('<Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>') ? 'Yes' : 'No'}`);
    console.log(`- Contains IncidentAddress1: ${xml.includes('<IncidentAddress1>') ? 'Yes' : 'No'}`);
    console.log(`- Patient fields: ${xml.includes('<PatientFirstName>') ? 'Yes' : 'No'}`);
    console.log(`\nXML saved to: ${outputPath}`);
    
    // Validate XML structure
    validateXml(xml);
  } catch (error) {
    console.error(`Error with exact match generator: ${error.message}`);
  }
}

function validateXml(xml) {
  // Check for malformed tags
  if (xml.includes('</IncidentAddress1>>')) {
    console.error('❌ ERROR: XML contains malformed address tag');
  } else if (!xml.includes('<IncidentAddress1>')) {
    console.error('❌ ERROR: XML missing IncidentAddress1 tag');
  } else {
    console.log('✅ XML formatting validation passed');
  }
  
  // Check for patient data
  if (xml.includes('<PatientFirstName>') && 
      xml.includes('<PatientLastName>') && 
      xml.includes('<PatientDOB>')) {
    console.log('✅ Patient data validation passed');
  } else {
    console.warn('⚠️ WARNING: Patient data may be incomplete');
  }
  
  // Check for proper structure
  if (xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>') &&
      xml.includes('<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">') &&
      xml.includes('<Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>')) {
    console.log('✅ XML structure validation passed');
  } else {
    console.error('❌ ERROR: XML structure validation failed');
  }
}

function testWithMockData() {
  // Sample call data
  const mockCall = {
    GetCall: {
      Data: {
        CallId: "99999",
        LoggedOn: new Date().toISOString(),
        Name: "TEST - Mock Call",
        Priority: "1560",
        Nature: "This is a mock call for testing",
        Type: "Medical Emergency",
        Address: "123 Test St, Test City, CA 90210, USA",
        ContactName: "John Doe",
        ContactInfo: "(555) 123-4567",
        ExternalId: "01-01-1980"
      }
    },
    GetCallExtraData: {
      Data: {
        Dispatches: [
          {
            Type: "Unit",
            Name: "STN1",
            EnRouteTime: new Date(Date.now() - 30*60000).toISOString(),
            ArrivedTime: new Date(Date.now() - 20*60000).toISOString()
          }
        ]
      }
    }
  };
  
  // Generate XML
  const xml = generateXML(mockCall);
  
  // Save to file
  const outputPath = path.join(__dirname, 'logs', 'mock_call_production.xml');
  fs.writeFileSync(outputPath, xml);
  
  console.log('\nGenerated XML with mock data:');
  console.log(`- XML size: ${xml.length} characters`);
  console.log(`- Contains Guid: ${xml.includes('<Guid>b394de98-a5b7-408d-a1f2-020eddff92b9</Guid>') ? 'Yes' : 'No'}`);
  console.log(`- Contains IncidentAddress1: ${xml.includes('<IncidentAddress1>') ? 'Yes' : 'No'}`);
  console.log(`- Patient fields: ${xml.includes('<PatientFirstName>') ? 'Yes' : 'No'}`);
  console.log(`\nXML saved to: ${outputPath}`);
  
  // Validate XML structure
  validateXml(xml);
  
  // Test with the exact match generator
  testExactMatchGenerator(mockCall);
}

// Run the test
main();