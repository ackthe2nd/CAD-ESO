/**
 * Test updating a real call to populate the Call Received Time and GPS coordinate columns
 */

require('dotenv').config();
const { getApiToken } = require('./src/resgrid-api');
const { sheetCallRow } = require('./src/sheets-logger');

async function testRealCallUpdate() {
  console.log('Testing real call update to populate individual columns...');
  
  try {
    // Get a valid API token
    const token = await getApiToken();
    if (!token) {
      console.log('Failed to get API token');
      return;
    }
    
    // Fetch call 201108 (one of our test calls)
    const callId = '201108';
    console.log(`Fetching call ${callId}...`);
    
    const axios = require('axios');
    
    // Get call data
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall`, {
      params: { callId },
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!callResponse.data || !callResponse.data.Data) {
      console.log('Failed to get call data');
      return;
    }
    
    // Get extra data
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
      params: { callId },
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const callData = callResponse.data.Data;
    const extraData = extraResponse.data || {};
    
    console.log(`Call data retrieved for ${callData.CallId}: ${callData.Name}`);
    
    // Generate XML with the current xml-generator
    const { generateXML } = require('./src/xml-generator');
    const xmlResult = await generateXML(callData, extraData);
    const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    console.log(`Generated XML (${xml.length} chars)`);
    
    // Check if XML contains our target fields
    const callReceivedMatch = xml.match(/<CallReceivedTime>(.*?)<\/CallReceivedTime>/);
    const latMatch = xml.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
    const longMatch = xml.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
    
    console.log('XML contains:');
    console.log(`  CallReceivedTime: ${callReceivedMatch ? callReceivedMatch[1] : 'NOT FOUND'}`);
    console.log(`  GPS Latitude: ${latMatch ? latMatch[1] : 'NOT FOUND'}`);
    console.log(`  GPS Longitude: ${longMatch ? longMatch[1] : 'NOT FOUND'}`);
    
    // Update the call in Google Sheets with the actual XML
    console.log('Updating call in Google Sheets...');
    const result = await sheetCallRow(
      callData,
      extraData,
      'Updated - Field Test',
      'test://field-extraction',
      xml
    );
    
    console.log(`Sheet update result: ${result}`);
    
    if (result) {
      console.log('Successfully updated Google Sheets with extracted fields');
      
      // Wait a moment then verify
      console.log('Waiting 3 seconds for data to sync...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Run verification
      const { exec } = require('child_process');
      exec('node verify-sheets-data.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Verification error:', error);
          return;
        }
        
        console.log('\nVerification results:');
        const lines = stdout.split('\n');
        let callSection = false;
        
        lines.forEach(line => {
          if (line.includes(`Call ${callId}:`)) {
            callSection = true;
            console.log(line);
          } else if (callSection && line.trim() === '') {
            callSection = false;
          } else if (callSection) {
            console.log(line);
          }
        });
      });
      
    } else {
      console.log('Failed to update Google Sheets');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testRealCallUpdate();