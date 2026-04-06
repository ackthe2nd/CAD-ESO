/**
 * Test the incident type extraction fix by forcing updates to existing calls
 */

require('dotenv').config();

async function testIncidentTypeFix() {
  console.log('Testing incident type extraction fix...');
  
  const { sheetCallRow } = require('./src/sheets-logger');
  
  // Test CAD call (should extract "Medical Emergency" from call name)
  const cadCallData = {
    CallId: '201104',
    Name: 'CAD TEST - Medical Incident (Non-Emergent)',
    Nature: '</p><p>SPECIFIC LOCATION:</p><p>ALERTS: </p><p>DETAILS: </p><p>COMPLAINANT: </p><p>HAS 911 BEEN CONTACTED?: </p>',
    Address: '7600 Canoga Ave, Canoga Park, CA 91303',
    Geolocation: '34.208242669722026, -118.48360512299296',
    LoggedOn: '2025-06-07T15:01:05.833',
    Priority: 1560,
    State: 1
  };

  const cadExtraData = {
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

  // Test form call (should extract from nature field)
  const formCallData = {
    CallId: '201105',
    Name: 'FORM TEST - PERSON DOWN',
    Nature: 'INCIDENT TYPE: GENERAL MEDICAL\nPatient found unconscious',
    Address: '123 Test Street, Test City, CA 91234',
    Geolocation: '34.18761, -118.46652',
    LoggedOn: '2025-06-07T15:06:49.12',
    Priority: 1560,
    State: 1
  };

  const formExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'SETMED1',
          Location: 'Station 1'
        }
      ],
      Activity: []
    }
  };

  try {
    console.log('\n=== Testing CAD call incident type extraction ===');
    console.log('Call Name:', cadCallData.Name);
    console.log('Nature (truncated):', cadCallData.Nature.substring(0, 50) + '...');
    
    const cadResult = await sheetCallRow(cadCallData, cadExtraData, 'Incident Type Fix Test', 'test://cad-update');
    console.log('CAD call update result:', cadResult);

    console.log('\n=== Testing Form call incident type extraction ===');
    console.log('Call Name:', formCallData.Name);
    console.log('Nature:', formCallData.Nature);
    
    const formResult = await sheetCallRow(formCallData, formExtraData, 'Incident Type Fix Test', 'test://form-update');
    console.log('Form call update result:', formResult);

    if (cadResult && formResult) {
      console.log('\n✅ Both calls updated successfully');
      console.log('Expected results:');
      console.log('- CAD call (201104): Incident Type should be "Medical Emergency"');
      console.log('- Form call (201105): Incident Type should be "Medical Emergency"');
      
      // Wait a moment for the updates to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify the results
      console.log('\nVerifying results...');
      const { exec } = require('child_process');
      exec('node verify-sheets-data.js', (error, stdout, stderr) => {
        if (error) {
          console.error('Verification error:', error);
          return;
        }
        
        console.log('\nVerification complete - check Google Sheets for updated Incident Type values');
      });
    } else {
      console.log('❌ Update failed');
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testIncidentTypeFix();