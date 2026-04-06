/**
 * Test Call Closure Logic
 * 
 * This script tests the extractClosedTime function logic directly
 * using mock data that simulates real Resgrid unit activities.
 */

require('dotenv').config();

// Mock data simulating a closed call with unit activities
const mockCallData = {
  CallId: 'TEST123',
  State: 0, // 0 = Active, 1 = Closed (numeric values from Resgrid API)
  ClosedOn: '', // No direct closed time
  DispatchClosedTime: ''
};

const mockExtraData = {
  Activity: [
    {
      Type: 'Unit',
      UnitName: 'TEST1',
      StatusId: 1,
      Timestamp: '2025-06-08T20:00:00.000Z',
      DestinationStateText: 'Dispatched'
    },
    {
      Type: 'Unit', 
      UnitName: 'TEST1',
      StatusId: 5,
      Timestamp: '2025-06-08T20:05:00.000Z',
      DestinationStateText: 'En Route'
    },
    {
      Type: 'Unit',
      UnitName: 'TEST1', 
      StatusId: 6,
      Timestamp: '2025-06-08T20:15:00.000Z',
      DestinationStateText: 'On Scene'
    },
    {
      Type: 'Unit',
      UnitName: 'TEST1',
      StatusId: 3,
      Timestamp: '2025-06-08T20:25:00.000Z', 
      DestinationStateText: 'At Patient'
    },
    {
      Type: 'Unit',
      UnitName: 'TEST1',
      StatusId: 8, // CLEARED - This should indicate call closure
      Timestamp: '2025-06-08T20:45:00.000Z',
      DestinationStateText: 'Cleared'
    },
    {
      Type: 'Unit',
      UnitName: 'TEST1',
      StatusId: 2, // AVAILABLE - This should indicate back in service
      Timestamp: '2025-06-08T20:50:00.000Z',
      DestinationStateText: 'Available'
    }
  ]
};

// Pacific Time conversion function (simplified for testing)
function convertToPacificTime(timestamp) {
  if (!timestamp) return '';
  // For testing, just return the timestamp as-is
  return timestamp;
}

// Test the extractClosedTime logic
function testExtractClosedTime(callGetData, extraGetData) {
  console.log('Testing extractClosedTime logic...');
  
  // Replicate the extractClosedTime function logic
  const closedSources = [
    callGetData.ClosedOn || '',
    callGetData.CallClosedTime || '',
    callGetData.DispatchClosedTime || '',
    extraGetData.ClosedOn || '',
    extraGetData.CallClosedTime || '',
    extraGetData.Data?.ClosedOn || '',
    extraGetData.Data?.CallClosedTime || ''
  ];
  
  // Filter out invalid timestamps like "0001-01-01T00:00:00"
  let closedTime = closedSources.filter(time => 
    time && 
    time.trim() && 
    !time.startsWith('0001-01-01')
  )[0] || '';
  
  console.log('Direct closure sources:', closedSources);
  console.log('Found direct closure time:', closedTime || 'None');
  
  // If no direct closed time found, check unit activities for closure indicators
  const unitActivityData = extraGetData.Activity || [];
  if (!closedTime && unitActivityData && Array.isArray(unitActivityData)) {
    const closureStatusIds = [8, 2, 9]; // Cleared, Available, Returning
    
    console.log('\nChecking unit activities for closure indicators...');
    
    // Find the latest closure activity timestamp
    const closureActivities = unitActivityData
      .filter(activity => {
        const isUnit = activity.Type === 'Unit';
        const hasStatusId = activity.StatusId && closureStatusIds.includes(activity.StatusId);
        const hasTimestamp = activity.Timestamp && !activity.Timestamp.startsWith('0001-01-01');
        
        console.log(`Activity: ${activity.UnitName} Status ${activity.StatusId} - Unit: ${isUnit}, HasStatus: ${hasStatusId}, HasTime: ${hasTimestamp}`);
        
        return isUnit && hasStatusId && hasTimestamp;
      })
      .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
    
    console.log(`Found ${closureActivities.length} closure activities`);
    
    if (closureActivities.length > 0) {
      closedTime = convertToPacificTime(closureActivities[0].Timestamp);
      console.log(`Latest closure activity: ${closureActivities[0].UnitName} Status ${closureActivities[0].StatusId} at ${closureActivities[0].Timestamp}`);
    }
  }
  
  // If still no closed time and call state indicates closure, use current time
  // State: 0 = Active, State: 1 = Closed (numeric values from Resgrid API)
  if (!closedTime && (callGetData.State === 1 || callGetData.State === '1')) {
    closedTime = convertToPacificTime(new Date().toISOString());
    console.log('Call state indicates closure, using current time');
  }
  
  console.log('\nFinal closure time:', closedTime || 'None found');
  
  // Test the callClosed boolean logic
  const callClosed = (closedTime && closedTime.trim() !== '' && !closedTime.startsWith('0001-01-01')) ? 'Yes' : 'No';
  console.log('Call Closed flag:', callClosed);
  
  return { closedTime, callClosed };
}

// Run tests
console.log('Call Closure Logic Test');
console.log('=======================');

console.log('\nTest 1: Call with closure activities');
console.log('------------------------------------');
const result1 = testExtractClosedTime(mockCallData, mockExtraData);

console.log('\nTest 2: Call with direct ClosedOn field');
console.log('---------------------------------------');
const mockCallData2 = {
  ...mockCallData,
  ClosedOn: '2025-06-08T21:00:00.000Z'
};
const result2 = testExtractClosedTime(mockCallData2, { Activity: [] });

console.log('\nTest 3: Call with no closure data');
console.log('---------------------------------');
const mockCallData3 = {
  ...mockCallData,
  State: 'Active'
};
const mockExtraData3 = {
  Activity: [
    {
      Type: 'Unit',
      UnitName: 'TEST1',
      StatusId: 5,
      Timestamp: '2025-06-08T20:05:00.000Z',
      DestinationStateText: 'En Route'
    }
  ]
};
const result3 = testExtractClosedTime(mockCallData3, mockExtraData3);

console.log('\n======================');
console.log('Test Results Summary:');
console.log('======================');
console.log(`Test 1 - Closure from activities: ${result1.callClosed} (${result1.closedTime})`);
console.log(`Test 2 - Direct ClosedOn field: ${result2.callClosed} (${result2.closedTime})`);
console.log(`Test 3 - No closure data: ${result3.callClosed} (${result3.closedTime || 'None'})`);