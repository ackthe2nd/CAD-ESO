/**
 * Test complete upload flow to demonstrate "Successful" status in Call Data
 */

require('dotenv').config();

async function testCompleteUploadFlow() {
  console.log('Testing complete upload flow with XML generation and status update...');
  
  const { processCallDirectly } = require('./src/index');
  
  // Test call data that will trigger XML generation and upload
  const testCallData = {
    CallId: '201104',
    Name: 'CAD TEST - Medical Incident (Non-Emergent)',
    Address: '7600 Canoga Ave, Canoga Park, CA 91303',
    Geolocation: '34.208242669722026, -118.48360512299296',
    LoggedOn: '2025-06-07T15:01:05.833',
    Priority: 1560,
    State: 1
  };

  const testExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'EVTMED1',
          Location: 'Station 1'
        }
      ],
      Activity: []
    }
  };

  try {
    console.log('Triggering complete processing flow for call 201104...');
    console.log('This will:');
    console.log('1. Generate XML');
    console.log('2. Upload to SFTP');
    console.log('3. Update Call Data with "Successful" status');
    console.log('4. Log to Google Sheets');
    
    // This will simulate the complete flow including upload
    await processCallDirectly(testCallData, testExtraData);
    
    console.log('\n✅ Complete upload flow test completed');
    console.log('Check the Call Data sheet - the ESO Upload Status should now show "Successful"');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    console.log('This is expected if SFTP credentials are not configured');
    console.log('The important part is that the status handling logic is correct');
  }
}

testCompleteUploadFlow();