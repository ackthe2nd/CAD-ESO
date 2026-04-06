/**
 * Test Field Preservation During Call Updates
 * Verifies that existing field data is preserved when calls are updated
 */

require('dotenv').config();
const { sheetCallRow, sheetLog } = require('./src/sheets-logger');

/**
 * Test field preservation functionality
 */
async function testFieldPreservation() {
  console.log('='.repeat(60));
  console.log('TESTING FIELD PRESERVATION DURING UPDATES');
  console.log('='.repeat(60));
  
  try {
    await sheetLog('Testing field preservation during call updates', 'info');
    
    const testCallId = 'PRESERVE_TEST_001';
    
    // Step 1: Create initial comprehensive entry
    console.log('\nStep 1: Creating comprehensive initial entry...');
    const initialCallData = {
      CallId: testCallId,
      Name: 'Comprehensive Test Call - Initial',
      LoggedOn: '2025-06-08T15:00:00.000Z',
      State: 'Active',
      Nature: 'Medical Emergency - Comprehensive Data',
      Address: '123 Complete Street, Full City, CA 90210',
      Geolocation: '34.0522,-118.2437',
      Priority: 1560,
      ContactName: 'John Patient',
      ContactInfo: '(555) 123-4567'
    };
    
    const initialExtraData = {
      Data: {
        Activity: [
          {
            UnitId: 8826,
            UnitName: 'STN1',
            Activity: 'Dispatched',
            Timestamp: '2025-06-08T15:00:00.000Z'
          },
          {
            UnitId: 8826,
            UnitName: 'STN1',
            Activity: 'En Route',
            Timestamp: '2025-06-08T15:05:00.000Z'
          }
        ],
        Dispatches: [
          {
            UnitId: 8826,
            Name: 'STN1',
            DispatchedOn: '2025-06-08T15:00:00.000Z'
          },
          {
            UnitId: 8827,
            Name: 'EVTMED1',
            DispatchedOn: '2025-06-08T15:00:00.000Z'
          }
        ]
      }
    };
    
    await sheetCallRow(
      initialCallData,
      initialExtraData,
      'Comprehensive Initial Entry',
      '',
      null
    );
    console.log('✅ Created comprehensive initial entry');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Update with minimal data (simulating closure with sparse data)
    console.log('\nStep 2: Updating with minimal closure data...');
    const closureUpdateData = {
      CallId: testCallId, // Same Call ID
      State: 'Closed',
      ClosedOn: '2025-06-08T16:30:00.000Z'
      // Note: Intentionally missing most fields to test preservation
    };
    
    const closureExtraData = {
      Data: {
        Activity: [],
        Dispatches: [{
          UnitId: 8826,
          Name: 'STN1',
          DispatchedOn: '2025-06-08T15:00:00.000Z'
        }]
      }
    };
    
    await sheetCallRow(
      closureUpdateData,
      closureExtraData,
      'Field Preservation Test - Closure Update',
      '',
      null
    );
    console.log('✅ Applied closure update with minimal data');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Another update with different field (testing selective preservation)
    console.log('\nStep 3: Testing selective field updates...');
    const selectiveUpdateData = {
      CallId: testCallId,
      Name: 'Updated Call Name Only',
      // All other fields intentionally missing
    };
    
    await sheetCallRow(
      selectiveUpdateData,
      initialExtraData, // Using original extra data
      'Field Preservation Test - Selective Update',
      '',
      null
    );
    console.log('✅ Applied selective field update');
    
    console.log('\n--- Expected Results ---');
    console.log('Initial Entry: All fields populated');
    console.log('After Closure: Previous data preserved + Call Closed = Yes + Call Closed Time populated');
    console.log('After Selective: Name updated, all other previous data preserved');
    console.log('Patient Info: Should remain "John Patient" and "(555) 123-4567"');
    console.log('Address: Should remain "123 Complete Street, Full City, CA 90210"');
    console.log('GPS Coordinates: Should remain "34.0522" and "-118.2437"');
    
    await sheetLog('Field preservation test completed - Check spreadsheet for preserved data', 'info', 'Test Complete');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    await sheetLog(`Field preservation test failed: ${error.message}`, 'error', 'Test Failed');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('FIELD PRESERVATION TEST COMPLETED');
  console.log('='.repeat(60));
}

// Run the test
testFieldPreservation().catch(console.error);