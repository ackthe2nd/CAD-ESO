/**
 * Force update of an existing call to test Call Received Time extraction
 */

require('dotenv').config();

async function forceCallUpdate() {
  console.log('Testing Call Received Time field extraction by forcing an update...');
  
  // Simulate a call update by creating test data that matches call 201108 but forces a re-process
  const testCallData = {
    CallId: '201108',
    Name: 'TEST - Updated for Call Received Time',
    Nature: 'Medical Emergency',
    Address: '1234 Test Ave, Test City, CA 91401',
    Geolocation: '34.089045321435584,-118.35037704321545',
    LoggedOn: '2025-06-07T15:48:11.08',
    Priority: 1560,
    State: 1,
    UnitsCsv: 'SNT1'
  };

  const testExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'SNT1',
          Location: 'Station 1'
        }
      ],
      Activity: []
    }
  };

  // Create XML with CallReceivedTime
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
      <E05_01>201108</E05_01>
      <E05_02>001122334455</E05_02>
      <E05_04>390</E05_04>
      <E05_06>6250</E05_06>
      <E05_07>TEST - Updated for Call Received Time</E05_07>
      <E05_08>1234 Test Ave, Test City, CA 91401</E05_08>
      <E05_09>34.089045321435584</E05_09>
      <E05_10>-118.35037704321545</E05_10>
    </CallData>
    <CallReceivedTime>2025-06-07T15:48:11.08</CallReceivedTime>
    <SceneGpsLocationLat>34.089045321435584</SceneGpsLocationLat>
    <SceneGpsLocationLong>-118.35037704321545</SceneGpsLocationLong>
  </EMSDataSet>
</EmsDataSet>`;

  try {
    const { sheetCallRow } = require('./src/sheets-logger');
    
    console.log('Forcing update of call 201108 with Call Received Time extraction...');
    const result = await sheetCallRow(
      testCallData,
      testExtraData,
      'Updated - Call Received Time Test',
      'test://force-update',
      testXML
    );
    
    console.log(`Update result: ${result}`);
    
    if (result) {
      console.log('Successfully updated call 201108 with Call Received Time extraction');
      
      // Wait for update to sync
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check the results
      const { exec } = require('child_process');
      exec('node verify-sheets-data.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Verification error:', error);
          return;
        }
        
        console.log('\nVerification results for call 201108:');
        const lines = stdout.split('\n');
        let callSection = false;
        
        lines.forEach(line => {
          if (line.includes('Call 201108:')) {
            callSection = true;
            console.log(line);
          } else if (callSection && line.trim() === '') {
            callSection = false;
          } else if (callSection) {
            console.log(line);
            if (line.includes('Call Received Time: 2025-06-07T15:48:11.08')) {
              console.log('SUCCESS: Call Received Time now properly extracted and populated!');
            } else if (line.includes('Call Received Time: N/A')) {
              console.log('Still showing N/A for Call Received Time');
            }
          }
        });
      });
    } else {
      console.log('Failed to update call');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

forceCallUpdate();