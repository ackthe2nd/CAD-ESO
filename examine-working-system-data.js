/**
 * Examine Working System Data
 * 
 * Since the API calls are failing, let's examine the data structure
 * from what's actually being processed in the working system.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');

// Import the actual modules used by the working system
const sheetsLogger = require('./src/sheets-logger');

async function examineWorkingSystemData() {
  console.log('Examining Working System Data Structure');
  console.log('======================================');
  
  // Create a mock call data structure based on what we see in the logs
  const mockCallData = {
    CallId: '201192',
    Priority: 1560,
    Name: 'Form Test',
    Nature: 'Non-Emergency EVTMED1 IC1 Form Test EMS ASSIST EVENT Rams Non-Emergency INCIDENT TYPE',
    Note: '',
    Address: '7370-7350 Romaine St, Los Angeles, CA 90046',
    Geolocation: '34.18929, -118.46104',
    LoggedOn: '2025-06-08T13:27:04.34',
    State: 'Active',
    Number: '201192',
    NotesCount: 0,
    AudioCount: 0,
    ImgagesCount: 0,
    FileCount: 0,
    What3Words: '',
    ContactName: '',
    ContactInfo: '',
    ReferenceId: '',
    ExternalId: '',
    IncidentId: '',
    AudioFileId: '',
    Type: '',
    LoggedOnUtc: '2025-06-08T20:27:04.34',
    DispatchedOn: null,
    DispatchedOnUtc: null,
    Latitude: 34.18929,
    Longitude: -118.46104,
    Protocols: []
  };

  const mockExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'EVTMED1',
          Timestamp: '2025-06-08T20:27:04.34'
        },
        {
          Type: 'Unit', 
          Name: 'IC1',
          Timestamp: '2025-06-08T20:27:04.34'
        }
      ],
      Activity: [
        {
          Type: 'Unit',
          UnitName: 'IC1',
          StatusId: 5,
          Timestamp: '2025-06-08T20:34:04.627',
          DestinationStateText: 'En Route'
        }
      ]
    }
  };

  console.log('Mock call data structure based on system logs:');
  console.log('CallId:', mockCallData.CallId);
  console.log('State:', mockCallData.State);
  console.log('LoggedOn:', mockCallData.LoggedOn);
  console.log('DispatchedOn:', mockCallData.DispatchedOn);
  console.log('DispatchedOnUtc:', mockCallData.DispatchedOnUtc);
  
  // Check all fields for closure-related terms
  console.log('\nChecking all call data fields for closure indicators:');
  Object.keys(mockCallData).forEach(key => {
    const value = mockCallData[key];
    const lowerKey = key.toLowerCase();
    const isClosureRelated = lowerKey.includes('close') || lowerKey.includes('end') || 
                            lowerKey.includes('complete') || lowerKey.includes('finish') ||
                            lowerKey.includes('clear') || lowerKey.includes('state');
    
    if (isClosureRelated || value !== null && value !== undefined && value !== '') {
      console.log(`  ${key}: ${value} ${isClosureRelated ? '(CLOSURE RELATED)' : ''}`);
    }
  });

  // Simulate what happens when the call gets closed
  console.log('\n=== SIMULATING CALL CLOSURE ===');
  
  // Create a version with closure activities
  const closedCallExtraData = {
    ...mockExtraData,
    Data: {
      ...mockExtraData.Data,
      Activity: [
        ...mockExtraData.Data.Activity,
        {
          Type: 'Unit',
          UnitName: 'IC1',
          StatusId: 6, // On Scene
          Timestamp: '2025-06-08T20:45:00.000',
          DestinationStateText: 'On Scene'
        },
        {
          Type: 'Unit',
          UnitName: 'IC1', 
          StatusId: 8, // Cleared
          Timestamp: '2025-06-08T21:15:00.000',
          DestinationStateText: 'Cleared'
        },
        {
          Type: 'Unit',
          UnitName: 'IC1',
          StatusId: 2, // Available  
          Timestamp: '2025-06-08T21:20:00.000',
          DestinationStateText: 'Available'
        }
      ]
    }
  };

  // Test our closure detection logic
  console.log('\nTesting closure detection with simulated closed call:');
  
  // Replicate the extractClosedTime logic
  const unitActivityData = closedCallExtraData.Data.Activity;
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

  console.log(`Found ${closureActivities.length} closure activities:`);
  closureActivities.forEach(activity => {
    console.log(`  ${activity.UnitName}: Status ${activity.StatusId} at ${activity.Timestamp}`);
  });

  if (closureActivities.length > 0) {
    const latestClosure = closureActivities[0];
    console.log(`\nLatest closure time would be: ${latestClosure.Timestamp}`);
    console.log('Call Closed flag would be: Yes');
  }

  // Check if there are any other fields in Resgrid that might contain closure data
  console.log('\n=== POTENTIAL CLOSURE FIELDS TO INVESTIGATE ===');
  const potentialFields = [
    'ClosedOn', 'CallClosedTime', 'DispatchClosedTime', 'EndTime', 'CompletedOn',
    'CallCompleted', 'CallClosed', 'CallEndTime', 'ClosedOnUtc', 'EndedOn',
    'Finished', 'Complete', 'Ended', 'CloseTime', 'CallClose', 'CallFinished'
  ];
  
  console.log('Fields to check in future API responses:');
  potentialFields.forEach(field => {
    console.log(`  - ${field}`);
  });

  console.log('\n=== CONCLUSION ===');
  console.log('Based on the working system logs, closure detection should rely on:');
  console.log('1. Unit activities with Status IDs 8 (Cleared), 2 (Available), 9 (Returning)');
  console.log('2. The latest timestamp from these activities as the closure time');
  console.log('3. No direct closure fields appear to be populated in the call data');
  console.log('4. The enhanced extractClosedTime() function should handle this correctly');
}

// Run the examination
examineWorkingSystemData();