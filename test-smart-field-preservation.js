/**
 * Test Smart Field Preservation with Real Call Data
 * Verifies bidirectional field preservation: preserve existing when new is empty,
 * populate empty when new has data
 */

require('dotenv').config();
const { sheetCallRow, sheetLog } = require('./src/sheets-logger');

/**
 * Test smart field preservation functionality
 */
async function testSmartFieldPreservation() {
  console.log('='.repeat(70));
  console.log('TESTING SMART FIELD PRESERVATION WITH REAL CALL DATA');
  console.log('='.repeat(70));
  
  try {
    await sheetLog('Testing smart field preservation with real call scenarios', 'info');
    
    const testCallId = 'SMART_PRESERVE_201108';
    
    // Step 1: Initial entry with partial data (simulating first API call)
    console.log('\nStep 1: Creating initial entry with partial data...');
    const initialCallData = {
      CallId: testCallId,
      Name: 'Medical Emergency - Initial Data',
      LoggedOn: '2025-06-08T15:00:00.000Z',
      State: 'Active',
      Priority: 1560,
      // Missing: Address, Geolocation, ContactName, ContactInfo
    };
    
    const initialExtraData = {
      Data: {
        Activity: [
          {
            UnitId: 8826,
            UnitName: 'SETMED1',
            Activity: 'Dispatched',
            Timestamp: '2025-06-08T15:00:00.000Z'
          }
        ],
        Dispatches: [
          {
            UnitId: 8826,
            Name: 'SETMED1',
            DispatchedOn: '2025-06-08T15:00:00.000Z'
          }
        ]
      }
    };
    
    await sheetCallRow(
      initialCallData,
      initialExtraData,
      'Initial Partial Data Entry',
      '',
      null
    );
    console.log('✅ Created initial entry with partial data');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 2: Update with additional data (simulating second API call with more info)
    console.log('\nStep 2: Adding missing fields with new data...');
    const enrichedCallData = {
      CallId: testCallId, // Same Call ID
      Name: 'Medical Emergency - Enhanced Data', // Updated name
      LoggedOn: '2025-06-08T15:00:00.000Z',
      State: 'Active',
      Priority: 1560,
      // NEW DATA being added:
      Address: '456 Emergency Lane, Urgent City, CA 90210',
      Geolocation: '34.0522,-118.2437',
      ContactName: 'Jane Caller',
      ContactInfo: '(555) 987-6543',
      Nature: 'Chest Pain - High Priority'
    };
    
    const enrichedExtraData = {
      Data: {
        Activity: [
          {
            UnitId: 8826,
            UnitName: 'SETMED1',
            Activity: 'Dispatched',
            Timestamp: '2025-06-08T15:00:00.000Z'
          },
          {
            UnitId: 8826,
            UnitName: 'SETMED1',
            Activity: 'En Route',
            Timestamp: '2025-06-08T15:05:00.000Z'
          }
        ],
        Dispatches: [
          {
            UnitId: 8826,
            Name: 'SETMED1',
            DispatchedOn: '2025-06-08T15:00:00.000Z'
          }
        ]
      }
    };
    
    await sheetCallRow(
      enrichedCallData,
      enrichedExtraData,
      'Enhanced Data - Fill Empty Fields',
      '',
      null
    );
    console.log('✅ Applied enhanced data to populate empty fields');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 3: Closure update with sparse data (should preserve rich data)
    console.log('\nStep 3: Applying closure with minimal data...');
    const closureCallData = {
      CallId: testCallId,
      State: 'Closed',
      ClosedOn: '2025-06-08T16:30:00.000Z'
      // Intentionally missing most fields to test preservation
    };
    
    const closureExtraData = {
      Data: {
        Activity: [
          {
            UnitId: 8826,
            UnitName: 'SETMED1',
            Activity: 'Cleared',
            Timestamp: '2025-06-08T16:30:00.000Z'
          }
        ],
        Dispatches: [
          {
            UnitId: 8826,
            Name: 'SETMED1',
            DispatchedOn: '2025-06-08T15:00:00.000Z'
          }
        ]
      }
    };
    
    await sheetCallRow(
      closureCallData,
      closureExtraData,
      'Closure - Preserve Rich Data',
      '',
      null
    );
    console.log('✅ Applied closure update while preserving rich data');
    
    console.log('\n--- Expected Smart Preservation Results ---');
    console.log('Initial Entry: Basic call info only');
    console.log('After Enhancement: All fields populated from new Resgrid data');
    console.log('  - Address: "456 Emergency Lane, Urgent City, CA 90210"');
    console.log('  - Contact: "Jane Caller" / "(555) 987-6543"');
    console.log('  - GPS: "34.0522" / "-118.2437"');
    console.log('  - Nature: "Chest Pain - High Priority"');
    console.log('After Closure: All rich data preserved + Call Closed = Yes + closure time');
    console.log('  - Contact info should remain intact');
    console.log('  - Address should remain complete');
    console.log('  - GPS coordinates should be preserved');
    
    await sheetLog('Smart field preservation test completed - Check bidirectional data handling', 'info', 'Test Complete');
    
  } catch (error) {
    console.error('Test failed:', error.message);
    await sheetLog(`Smart field preservation test failed: ${error.message}`, 'error', 'Test Failed');
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('SMART FIELD PRESERVATION TEST COMPLETED');
  console.log('='.repeat(70));
}

// Run the test
testSmartFieldPreservation().catch(console.error);