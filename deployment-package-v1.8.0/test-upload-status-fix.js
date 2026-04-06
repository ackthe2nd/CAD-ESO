/**
 * Test the upload status fix to ensure Call Data shows "Successful" or "Failed"
 */

require('dotenv').config();

async function testUploadStatusFix() {
  console.log('Testing upload status fix in Call Data sheet...');
  
  const { sheetCallRow } = require('./src/sheets-logger');
  
  // Test with successful upload status
  const testCallData = {
    CallId: '201104',
    Name: 'CAD TEST - Medical Incident (Non-Emergent)',
    Nature: '</p><p>SPECIFIC LOCATION:</p><p>ALERTS: </p><p>DETAILS: </p><p>COMPLAINANT: </p><p>HAS 911 BEEN CONTACTED?: </p>',
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
    console.log('\n=== Testing with "Successful" upload status ===');
    
    const result = await sheetCallRow(
      testCallData, 
      testExtraData, 
      'Successful',  // This should now show "Successful" in ESO Upload Status
      'sftp.esosuite.net/test-file.xml',
      '<xml>Test XML content</xml>'
    );
    
    console.log('Update result:', result);
    
    if (result) {
      console.log('✅ Call updated successfully');
      console.log('Expected: ESO Upload Status should show "Successful"');
      
      // Wait a moment then test with Failed status
      setTimeout(async () => {
        console.log('\n=== Testing with "Failed" upload status ===');
        
        const failResult = await sheetCallRow(
          testCallData, 
          testExtraData, 
          'Failed',  // This should now show "Failed" in ESO Upload Status
          '',
          '<xml>Test XML content that failed</xml>'
        );
        
        console.log('Fail test result:', failResult);
        
        if (failResult) {
          console.log('✅ Failed status test completed');
          console.log('Expected: ESO Upload Status should show "Failed"');
        }
        
        // Test default status
        setTimeout(async () => {
          console.log('\n=== Testing default status (should be "Pending") ===');
          
          const defaultResult = await sheetCallRow(testCallData, testExtraData);
          
          console.log('Default test result:', defaultResult);
          
          if (defaultResult) {
            console.log('✅ Default status test completed');
            console.log('Expected: ESO Upload Status should show "Pending"');
            console.log('\nAll tests completed. Check the Call Data sheet to verify:');
            console.log('- ESO Upload Status column shows proper values');
            console.log('- No more "Processing..." entries');
            console.log('- Clear "Successful", "Failed", or "Pending" status');
          }
        }, 2000);
        
      }, 2000);
      
    } else {
      console.log('❌ Update failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testUploadStatusFix();