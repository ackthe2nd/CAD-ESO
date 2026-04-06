/**
 * Debug XML extraction for call 201192
 * Check if UnitNotifiedByDispatch is in the generated XML
 */
require('dotenv').config();
const axios = require('axios');
const { generateXML } = require('./src/xml-generator');

async function debugXMLExtraction() {
  try {
    console.log('Debugging XML extraction for call 201192');
    console.log('===========================================\n');

    // Get token
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    const tokenResponse = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
      Username: username,
      Password: password
    });

    const token = tokenResponse.data.Tk;

    console.log('1. Fetching call data...');
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const callData = callResponse.data.Data;

    console.log('2. Fetching extra data...');
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const extraData = extraResponse.data.Data;

    console.log('3. Generating XML...');
    const xmlResult = await generateXML(callData, extraData);
    const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;

    console.log('4. Checking for UnitNotifiedByDispatch in XML...');
    
    // Search for UnitNotifiedByDispatch
    const unitNotifiedMatch = xml.match(/<UnitNotifiedByDispatch>(.*?)<\/UnitNotifiedByDispatch>/);
    
    if (unitNotifiedMatch) {
      console.log(`✓ Found UnitNotifiedByDispatch: "${unitNotifiedMatch[1]}"`);
    } else {
      console.log('❌ UnitNotifiedByDispatch not found in XML');
    }

    // Show first 500 characters of XML to see structure
    console.log('\n5. XML preview (first 500 chars):');
    console.log(xml.substring(0, 500) + '...');

    // Search for any dispatch-related fields
    console.log('\n6. All dispatch-related fields in XML:');
    const dispatchMatches = xml.match(/<[^>]*[Dd]ispatch[^>]*>.*?<\/[^>]*>/g);
    if (dispatchMatches) {
      dispatchMatches.forEach(match => {
        console.log(`  ${match}`);
      });
    } else {
      console.log('  No dispatch-related fields found');
    }

    // Test the extraction function
    console.log('\n7. Testing extraction function:');
    
    function extractXMLFields(xmlContent) {
      if (!xmlContent) return {};
      
      const extractedFields = {};
      
      // Extract UnitNotifiedByDispatch for Unit Dispatched Times
      const unitNotifiedMatch = xmlContent.match(/<UnitNotifiedByDispatch>(.*?)<\/UnitNotifiedByDispatch>/);
      if (unitNotifiedMatch) {
        extractedFields.unitDispatchedTime = unitNotifiedMatch[1];
      }
      
      return extractedFields;
    }

    const extracted = extractXMLFields(xml);
    console.log('Extracted fields:', extracted);

    if (extracted.unitDispatchedTime) {
      console.log(`✓ Successfully extracted dispatch time: "${extracted.unitDispatchedTime}"`);
    } else {
      console.log('❌ Failed to extract dispatch time');
    }

  } catch (error) {
    console.error('Debug failed:', error.message);
  }
}

if (require.main === module) {
  debugXMLExtraction();
}