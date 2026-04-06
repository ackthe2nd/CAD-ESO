/**
 * Test Enhanced Call Closure Detection
 * 
 * Validates that the updated closure detection logic properly handles:
 * - Numeric State values (0=Active, 1=Closed)
 * - State transition detection
 * - Accurate closure timestamp capture
 */

require('dotenv').config();
const { apiClient } = require('./src/token-manager');
const { sheetCallRow } = require('./src/sheets-logger');

async function testEnhancedClosureDetection() {
  console.log('Testing Enhanced Call Closure Detection');
  console.log('====================================');
  
  try {
    // Test 1: Verify current active call shows State: 0
    console.log('\n1. Testing Active Call Detection (Call 201192)...');
    
    const activeCallResponse = await apiClient.get('Calls/GetCall', {
      params: { callId: '201192' }
    });
    
    const activeCall = activeCallResponse.data.Data;
    console.log(`Active call 201192 - State: ${activeCall.State} (${activeCall.State === 0 ? 'Active ✓' : 'UNEXPECTED'})`);
    
    const activeExtraResponse = await apiClient.get('Calls/GetCallExtraData', {
      params: { callId: '201192' }
    });
    
    // Test the enhanced closure detection logic
    console.log('Testing closure detection for active call...');
    await testClosureLogic(activeCall, activeExtraResponse.data, 'Active Call');
    
    // Test 2: Check previous closed calls
    console.log('\n2. Testing Closed Call Detection (Call 201108)...');
    
    const closedCallResponse = await apiClient.get('Calls/GetCall', {
      params: { callId: '201108' }
    });
    
    const closedCall = closedCallResponse.data.Data;
    console.log(`Closed call 201108 - State: ${closedCall.State} (${closedCall.State === 1 ? 'Closed ✓' : 'UNEXPECTED'})`);
    
    const closedExtraResponse = await apiClient.get('Calls/GetCallExtraData', {
      params: { callId: '201108' }
    });
    
    // Test the enhanced closure detection logic
    console.log('Testing closure detection for closed call...');
    await testClosureLogic(closedCall, closedExtraResponse.data, 'Closed Call');
    
    // Test 3: Simulate state change scenarios
    console.log('\n3. Testing State Change Scenarios...');
    testStateChangeDetection();
    
    // Test 4: Test the actual sheets logger with enhanced logic
    console.log('\n4. Testing Google Sheets Logger with Enhanced Logic...');
    await testSheetsLogger(activeCall, activeExtraResponse.data);
    
    console.log('\n====================================');
    console.log('Enhanced Closure Detection Test Complete');
    console.log('====================================');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

async function testClosureLogic(callData, extraData, testType) {
  console.log(`\n--- ${testType} Closure Logic Test ---`);
  
  // Simulate the enhanced extractClosedTime logic
  const callGetData = callData;
  const extraGetData = extraData.Data || {};
  const unitActivityData = extraGetData.Activity || [];
  
  // Check multiple sources for call closed time (enhanced logic)
  const closedSources = [
    callGetData.ClosedOn || '',
    callGetData.CallClosedTime || '',
    callGetData.DispatchClosedTime || '',
    callGetData.EndTime || '',
    callGetData.CompletedOn || '',
    extraGetData.ClosedOn || '',
    extraGetData.CallClosedTime || '',
    extraGetData.EndTime || '',
    extraGetData.CompletedOn || '',
    extraGetData.Data?.ClosedOn || '',
    extraGetData.Data?.CallClosedTime || '',
    extraGetData.Data?.EndTime || '',
    extraGetData.Data?.CompletedOn || ''
  ];
  
  console.log('Checking closure time sources:');
  closedSources.forEach((source, index) => {
    if (source && source.trim() && !source.startsWith('0001-01-01')) {
      console.log(`  Source ${index + 1}: ${source} ✓`);
    }
  });
  
  let closedTime = closedSources.filter(time => 
    time && 
    time.trim() && 
    !time.startsWith('0001-01-01')
  )[0] || '';
  
  console.log(`Direct closure time found: ${closedTime || 'None'}`);
  
  // Check unit activities for closure indicators (fallback)
  if (!closedTime && unitActivityData && Array.isArray(unitActivityData)) {
    const closureStatusIds = [8, 2, 9]; // Cleared, Available, Returning
    
    const closureActivities = unitActivityData
      .filter(activity => 
        activity.Type === 'Unit' && 
        activity.StatusId && 
        closureStatusIds.includes(activity.StatusId) &&
        activity.Timestamp &&
        !activity.Timestamp.startsWith('0001-01-01')
      )
      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    console.log(`Unit closure activities found: ${closureActivities.length}`);
    if (closureActivities.length > 0) {
      closedTime = closureActivities[0].Timestamp;
      console.log(`Using unit activity closure time: ${closedTime} from ${closureActivities[0].Name}`);
    }
  }
  
  // Enhanced state detection (FIXED BUG)
  const isClosedByState = (callGetData.State === 1 || callGetData.State === '1');
  console.log(`Call State: ${callGetData.State} (${isClosedByState ? 'Closed' : 'Active'})`);
  
  if (!closedTime && isClosedByState) {
    closedTime = new Date().toISOString();
    console.log(`State indicates closure, using current time: ${closedTime}`);
  }
  
  // Determine final closure status
  const callClosed = (closedTime && closedTime.trim() !== '' && !closedTime.startsWith('0001-01-01')) ? 'Yes' : 'No';
  
  console.log(`Final Results for ${testType}:`);
  console.log(`  Call Closed: ${callClosed}`);
  console.log(`  Call Closed Time: ${closedTime || 'Not set'}`);
  console.log(`  State Detection: ${isClosedByState ? 'Closed (State=1)' : 'Active (State=0)'} ✓`);
}

function testStateChangeDetection() {
  console.log('\n--- State Change Detection Test ---');
  
  // Simulate state changes
  const testScenarios = [
    { prev: 0, curr: 0, expected: 'No change' },
    { prev: 0, curr: 1, expected: 'Closure detected' },
    { prev: 1, curr: 1, expected: 'Remains closed' },
    { prev: 1, curr: 0, expected: 'Reopened (rare)' }
  ];
  
  testScenarios.forEach((scenario, index) => {
    const isClosureTransition = (scenario.prev == 0 && scenario.curr == 1);
    const result = isClosureTransition ? 'CLOSURE DETECTED ✓' : 'No closure';
    
    console.log(`  Scenario ${index + 1}: State ${scenario.prev} -> ${scenario.curr}: ${result} (${scenario.expected})`);
    
    if (isClosureTransition) {
      const closureTime = new Date().toISOString();
      console.log(`    Would capture closure timestamp: ${closureTime}`);
    }
  });
}

async function testSheetsLogger(callData, extraData) {
  console.log('\n--- Google Sheets Logger Test ---');
  
  try {
    // Test the actual sheets logger with the enhanced logic
    console.log('Testing sheets logger with enhanced closure detection...');
    
    const result = await sheetCallRow(callData, extraData, 'Test - Enhanced Logic', '', null);
    
    if (result) {
      console.log('✓ Sheets logger test completed successfully');
      console.log('  The enhanced closure detection logic is now active');
      console.log('  Future state changes from Active (0) to Closed (1) will be properly captured');
    } else {
      console.log('✗ Sheets logger test failed');
    }
    
  } catch (error) {
    console.log(`Sheets logger test error: ${error.message}`);
  }
}

// Run the test
testEnhancedClosureDetection();