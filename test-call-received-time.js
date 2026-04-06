/**
 * Test Call Received Time extraction and population
 */

require('dotenv').config();
const { sheetCallRow } = require('./src/sheets-logger');

async function testCallReceivedTime() {
  console.log('Testing Call Received Time extraction...');
  
  // Create test XML with CallReceivedTime
  const testXML = `<?xml version="1.0" encoding="utf-8"?>
<EmsDataSet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns="http://www.nemsis.org/">
  <Header>
    <D01_01>23456</D01_01>
    <D01_03>CA</D01_03>
    <D01_04>06</D01_04>
    <D01_07>001122334455</D01_07>
    <D01_08>resgrid2eso</D01_08>
    <D01_09>1.0.0</D01_09>
    <D01_21>2025-06-08T00:10:00</D01_21>
  </Header>
  <EMSDataSet>
    <CallData>
      <E05_01>TEST123</E05_01>
      <E05_02>001122334455</E05_02>
      <E05_04>390</E05_04>
      <E05_06>6250</E05_06>
      <E05_07>Call Received Time Test</E05_07>
      <E05_08>123 Test St, Test City, CA 90210</E05_08>
      <E05_09>34.12345</E05_09>
      <E05_10>-118.56789</E05_10>
    </CallData>
    <CallReceivedTime>2025-06-07T16:15:30.123</CallReceivedTime>
    <SceneGpsLocationLat>34.12345</SceneGpsLocationLat>
    <SceneGpsLocationLong>-118.56789</SceneGpsLocationLong>
  </EMSDataSet>
</EmsDataSet>`;

  const testCallData = {
    CallId: 'TEST123',
    Name: 'Call Received Time Test',
    Nature: 'Test Emergency',
    Address: '123 Test St, Test City, CA 90210',
    Geolocation: '34.12345,-118.56789',
    LoggedOn: '2025-06-07T16:15:30.123',
    Priority: 1560,
    State: 1,
    UnitsCsv: 'TEST1'
  };

  const testExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'TEST1',
          Location: 'Test Station'
        }
      ],
      Activity: []
    }
  };

  try {
    console.log('Logging test call with Call Received Time extraction...');
    const result = await sheetCallRow(
      testCallData, 
      testExtraData, 
      'Test - Call Received Time', 
      'test://call-received-time', 
      testXML
    );
    
    console.log(`Result: ${result}`);
    
    if (result) {
      console.log('Successfully logged test call with Call Received Time');
      
      // Wait for data to sync
      console.log('Waiting 3 seconds for data to sync...');
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Verify the data
      const { exec } = require('child_process');
      exec('node verify-sheets-data.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Verification error:', error);
          return;
        }
        
        if (stdout.includes('TEST123')) {
          console.log('Test call TEST123 found in sheets');
          
          // Check for Call Received Time in individual column
          if (stdout.includes('Call Received Time: 2025-06-07T16:15:30.123')) {
            console.log('✅ SUCCESS: Call Received Time properly extracted and populated!');
          } else if (stdout.includes('Call Received Time: N/A')) {
            console.log('❌ Call Received Time still shows N/A in individual column');
          } else {
            console.log('⚠️ Call Received Time status unclear');
          }
          
          // Check GPS coordinates too
          if (stdout.includes('GPS Latitude: 34.12345') && stdout.includes('GPS Longitude: -118.56789')) {
            console.log('✅ GPS coordinates properly extracted and populated');
          }
        } else {
          console.log('❌ Test call TEST123 not found in verification');
        }
      });
    } else {
      console.log('❌ Failed to log test call');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testCallReceivedTime();