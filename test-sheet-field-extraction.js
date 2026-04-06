/**
 * Test XML field extraction and Google Sheets field mapping
 */

require('dotenv').config();
const { sheetCallRow } = require('./src/sheets-logger');

async function testFieldExtraction() {
  console.log('Testing XML field extraction and Google Sheets mapping...');
  
  // Create test call data with XML that includes CallReceivedTime and GPS coordinates
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
      <E05_01>201999</E05_01>
      <E05_02>001122334455</E05_02>
      <E05_04>390</E05_04>
      <E05_06>6250</E05_06>
      <E05_07>Medical Emergency</E05_07>
      <E05_08>1234 Test Ave, Test City, CA 90210</E05_08>
      <E05_09>34.12345</E05_09>
      <E05_10>-118.56789</E05_10>
    </CallData>
    <ResponseData>
      <E06_14>2025-06-07T15:30:00</E06_14>
    </ResponseData>
    <DispositionData>
      <E10_03>2025-06-07T15:30:00</E10_03>
    </DispositionData>
    <SceneData>
      <E07_01>2025-06-07T15:32:00</E07_01>
      <E07_15>34.12345</E07_15>
      <E07_16>-118.56789</E07_16>
    </SceneData>
    <PatientData>
      <E06_01>STN1</E06_01>
      <E06_02>Ambulance</E06_02>
      <E06_03>390</E06_03>
      <E06_11>2025-06-07T15:31:00</E06_11>
      <E06_12>2025-06-07T15:32:00</E06_12>
      <E06_13>2025-06-07T15:33:00</E06_13>
      <E06_16>2025-06-07T15:45:00</E06_16>
      <E06_17>2025-06-07T15:50:00</E06_17>
    </PatientData>
    <CallReceivedTime>2025-06-07T15:30:00</CallReceivedTime>
    <SceneGpsLocationLat>34.12345</SceneGpsLocationLat>
    <SceneGpsLocationLong>-118.56789</SceneGpsLocationLong>
  </EMSDataSet>
</EmsDataSet>`;

  const testCallData = {
    CallId: '201999',
    Name: 'TEST FIELD EXTRACTION',
    Nature: 'Medical Emergency',
    Address: '1234 Test Ave, Test City, CA 90210',
    Geolocation: '34.12345,-118.56789',
    LoggedOn: '2025-06-07T15:30:00',
    Priority: { Id: 1560, Name: 'Emergent' },
    State: 1,
    UnitsCsv: 'STN1'
  };

  const testExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'STN1',
          Location: 'Station 1'
        }
      ],
      Activity: []
    }
  };

  try {
    console.log('Calling sheetCallRow with test data...');
    const result = await sheetCallRow(
      testCallData, 
      testExtraData, 
      'Test Upload', 
      'test://url', 
      testXML
    );
    
    console.log('Result:', result);
    console.log('Test completed successfully');
    
    // Wait a moment then verify the data was written
    console.log('Waiting 3 seconds for data to be written...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Now check if the test call appears in sheets with the extracted fields
    const { exec } = require('child_process');
    exec('node verify-sheets-data.js', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running verification:', error);
        return;
      }
      
      if (stdout.includes('201999')) {
        console.log('✅ Test call 201999 found in verification output');
        console.log('Checking for extracted field values...');
        
        if (stdout.includes('Call Received Time: 2025-06-07T15:30:00')) {
          console.log('✅ Call Received Time successfully extracted and populated');
        } else {
          console.log('❌ Call Received Time not found in individual column');
        }
        
        if (stdout.includes('GPS Latitude: 34.12345')) {
          console.log('✅ GPS Latitude successfully extracted and populated');
        } else {
          console.log('❌ GPS Latitude not found in individual column');
        }
        
        if (stdout.includes('GPS Longitude: -118.56789')) {
          console.log('✅ GPS Longitude successfully extracted and populated');
        } else {
          console.log('❌ GPS Longitude not found in individual column');
        }
      } else {
        console.log('❌ Test call 201999 not found in sheets');
      }
    });
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testFieldExtraction();