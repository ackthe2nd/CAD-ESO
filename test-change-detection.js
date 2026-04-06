/**
 * Test Enhanced Change Detection System
 * Verifies that XML reuploads when units, times, or addresses change
 */

require('dotenv').config();

// Import the functions we need to test
function createCallSnapshot(callData, callExtraData) {
  const data = callExtraData?.Data || {};
  
  return {
    // Core call information
    callId: callData.CallId,
    name: callData.Name,
    nature: callData.Nature,
    note: callData.Note,
    address: callData.Address,
    geolocation: callData.Geolocation,
    
    // Call state and timing - critical for XML
    state: callData.State,
    loggedOn: callData.LoggedOn,
    loggedOnUtc: callData.LoggedOnUtc,
    dispatchedOn: callData.DispatchedOn,
    dispatchedOnUtc: callData.DispatchedOnUtc,
    closedOn: callData.ClosedOn,
    
    // Priority information
    priority: callData.Priority,
    
    // Location details that affect XML coordinates
    latitude: callData.Latitude,
    longitude: callData.Longitude,
    
    // Contact and reference information
    contactName: callData.ContactName,
    contactInfo: callData.ContactInfo,
    referenceId: callData.ReferenceId,
    externalId: callData.ExternalId,
    incidentId: callData.IncidentId,
    
    // Unit dispatches - critical for XML unit sections
    dispatches: data.Dispatches ? JSON.stringify(data.Dispatches.map(d => ({
      id: d.Id,
      name: d.Name,
      type: d.Type,
      status: d.Status,
      location: d.Location,
      userId: d.UserId,
      dispatchTime: d.DispatchTime,
      enRouteTime: d.EnRouteTime,
      arrivedTime: d.ArrivedTime,
      clearedTime: d.ClearedTime,
      backInServiceTime: d.BackInServiceTime,
      atPatientTime: d.AtPatientTime,
      transportTime: d.TransportTime,
      atHospitalTime: d.AtHospitalTime
    })).sort((a, b) => a.name.localeCompare(b.name))) : '[]',
    
    // Simplified unit list for easy comparison
    unitNames: data.Dispatches ? data.Dispatches.map(d => d.Name).sort().join(',') : '',
    unitCount: data.Dispatches ? data.Dispatches.length : 0,
    
    // Unit activities - tracks status changes that affect XML
    activities: data.Activity ? JSON.stringify(data.Activity.map(a => ({
      id: a.Id,
      unitId: a.UnitId,
      unitName: a.UnitName,
      type: a.Type,
      status: a.Status,
      timestamp: a.Timestamp,
      note: a.Note
    })).sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))) : '[]',
    
    // Extract all unit timing information for granular change detection
    unitTimings: data.Dispatches ? JSON.stringify(data.Dispatches.reduce((timings, unit) => {
      timings[unit.Name] = {
        dispatch: unit.DispatchTime || '',
        enRoute: unit.EnRouteTime || '',
        arrived: unit.ArrivedTime || '',
        atPatient: unit.AtPatientTime || '',
        transport: unit.TransportTime || '',
        atHospital: unit.AtHospitalTime || '',
        cleared: unit.ClearedTime || '',
        backInService: unit.BackInServiceTime || ''
      };
      return timings;
    }, {})) : '{}',
    
    // Address components for change detection
    fullAddress: callData.Address || '',
    addressComponents: (() => {
      const addr = callData.Address || '';
      const parts = addr.split(',').map(p => p.trim());
      return JSON.stringify({
        street: parts[0] || '',
        city: parts[1] || '',
        state: parts[2] || '',
        zip: parts[3] || '',
        full: addr
      });
    })(),
    
    // Protocol and call type information
    protocols: callData.Protocols ? JSON.stringify(callData.Protocols) : '',
    type: callData.Type,
    
    // Additional timestamps that might be added later
    audioFileId: callData.AudioFileId,
    notesCount: callData.NotesCount,
    audioCount: callData.AudioCount,
    imagesCount: callData.ImgagesCount,
    fileCount: callData.FileCount,
    
    // What3Words location if available
    what3Words: callData.What3Words,
    
    // Patient information if available in extra data
    patientInfo: data.PatientInfo ? JSON.stringify(data.PatientInfo) : '',
    
    // Narrative and additional notes that might change
    narrative: data.Narrative || '',
    additionalNotes: data.AdditionalNotes || '',
    
    // Create a hash of the entire extra data structure to catch any missed fields
    extraDataHash: callExtraData ? JSON.stringify(callExtraData).replace(/\s/g, '') : ''
  };
}

function detectCallChanges(previousSnapshot, currentSnapshot) {
  const xmlAffectingFields = [
    'unitNames', 'unitCount', 'unitTimings', 'fullAddress', 'addressComponents', 'geolocation',
    'name', 'nature', 'note',
    'state', 'loggedOn', 'loggedOnUtc', 'dispatchedOn', 'dispatchedOnUtc', 'closedOn',
    'priority', 'type', 'protocols',
    'latitude', 'longitude',
    'contactName', 'contactInfo', 'referenceId', 'externalId', 'incidentId',
    'dispatches', 'activities',
    'audioFileId', 'notesCount', 'audioCount', 'imagesCount', 'fileCount',
    'what3Words', 'patientInfo', 'narrative', 'additionalNotes',
    'extraDataHash'
  ];
  
  const changes = [];
  
  for (const field of xmlAffectingFields) {
    const prevValue = previousSnapshot[field] || '';
    const currValue = currentSnapshot[field] || '';
    
    if (prevValue !== currValue) {
      if (field === 'unitNames') {
        changes.push(`Units assigned: "${prevValue}" -> "${currValue}"`);
        console.log(`🚨 CRITICAL CHANGE - Units assigned: "${prevValue}" -> "${currValue}"`);
      } else if (field === 'unitCount') {
        changes.push(`Unit count: ${prevValue} -> ${currValue}`);
        console.log(`🚨 CRITICAL CHANGE - Unit count: ${prevValue} -> ${currValue}`);
      } else if (field === 'unitTimings') {
        changes.push(`Unit timings changed`);
        console.log(`🚨 CRITICAL CHANGE - Unit timings updated (will regenerate XML)`);
      } else if (field === 'fullAddress' || field === 'addressComponents') {
        changes.push(`Address: "${prevValue}" -> "${currValue}"`);
        console.log(`🚨 CRITICAL CHANGE - Address modified: "${prevValue}" -> "${currValue}"`);
      } else if (field === 'geolocation') {
        changes.push(`Location coordinates: "${prevValue}" -> "${currValue}"`);
        console.log(`🚨 CRITICAL CHANGE - GPS coordinates: "${prevValue}" -> "${currValue}"`);
      } else {
        changes.push(`${field}: "${prevValue}" -> "${currValue}"`);
        console.log(`Change detected in field '${field}': "${prevValue}" -> "${currValue}"`);
      }
    }
  }
  
  return changes.length > 0;
}

async function testChangeDetection() {
  console.log('='.repeat(60));
  console.log('TESTING ENHANCED CHANGE DETECTION SYSTEM');
  console.log('='.repeat(60));

  // Base call data
  const baseCallData = {
    CallId: '201104',
    Name: 'TEST - Medical Emergency',
    Nature: 'Medical Emergency',
    Address: '123 Main St, Anytown, CA, 90210',
    Geolocation: '34.0522, -118.2437',
    LoggedOn: '2025-06-08T20:00:00.000Z',
    State: 1,
    Priority: 1560
  };

  const baseExtraData = {
    Data: {
      Dispatches: [
        {
          Id: 1,
          Name: 'UNIT1',
          Type: 'Ambulance',
          Status: 'Dispatched',
          DispatchTime: '2025-06-08T20:01:00.000Z'
        }
      ],
      Activity: []
    }
  };

  // Test 1: Unit Assignment Changes
  console.log('\n=== TEST 1: Unit Assignment Changes ===');
  
  const snapshot1 = createCallSnapshot(baseCallData, baseExtraData);
  
  const modifiedExtraData1 = {
    Data: {
      Dispatches: [
        {
          Id: 1,
          Name: 'UNIT1',
          Type: 'Ambulance',
          Status: 'Dispatched',
          DispatchTime: '2025-06-08T20:01:00.000Z'
        },
        {
          Id: 2,
          Name: 'UNIT2',
          Type: 'Fire Engine',
          Status: 'Dispatched',
          DispatchTime: '2025-06-08T20:02:00.000Z'
        }
      ],
      Activity: []
    }
  };
  
  const snapshot2 = createCallSnapshot(baseCallData, modifiedExtraData1);
  const hasChanges1 = detectCallChanges(snapshot1, snapshot2);
  
  console.log(`Result: ${hasChanges1 ? '✅ CHANGE DETECTED' : '❌ NO CHANGE DETECTED'}`);
  console.log(`Expected: ✅ CHANGE DETECTED (unit added)`);

  // Test 2: Unit Timing Changes
  console.log('\n=== TEST 2: Unit Timing Changes ===');
  
  const modifiedExtraData2 = {
    Data: {
      Dispatches: [
        {
          Id: 1,
          Name: 'UNIT1',
          Type: 'Ambulance',
          Status: 'En Route',
          DispatchTime: '2025-06-08T20:01:00.000Z',
          EnRouteTime: '2025-06-08T20:03:00.000Z'
        }
      ],
      Activity: []
    }
  };
  
  const snapshot3 = createCallSnapshot(baseCallData, modifiedExtraData2);
  const hasChanges2 = detectCallChanges(snapshot1, snapshot3);
  
  console.log(`Result: ${hasChanges2 ? '✅ CHANGE DETECTED' : '❌ NO CHANGE DETECTED'}`);
  console.log(`Expected: ✅ CHANGE DETECTED (unit timing added)`);

  // Test 3: Address Changes
  console.log('\n=== TEST 3: Address Changes ===');
  
  const modifiedCallData3 = {
    ...baseCallData,
    Address: '456 Oak Ave, Newtown, CA, 90211'
  };
  
  const snapshot4 = createCallSnapshot(modifiedCallData3, baseExtraData);
  const hasChanges3 = detectCallChanges(snapshot1, snapshot4);
  
  console.log(`Result: ${hasChanges3 ? '✅ CHANGE DETECTED' : '❌ NO CHANGE DETECTED'}`);
  console.log(`Expected: ✅ CHANGE DETECTED (address changed)`);

  // Test 4: GPS Coordinate Changes
  console.log('\n=== TEST 4: GPS Coordinate Changes ===');
  
  const modifiedCallData4 = {
    ...baseCallData,
    Geolocation: '34.0600, -118.2500'
  };
  
  const snapshot5 = createCallSnapshot(modifiedCallData4, baseExtraData);
  const hasChanges4 = detectCallChanges(snapshot1, snapshot5);
  
  console.log(`Result: ${hasChanges4 ? '✅ CHANGE DETECTED' : '❌ NO CHANGE DETECTED'}`);
  console.log(`Expected: ✅ CHANGE DETECTED (coordinates changed)`);

  // Test 5: No Changes (Control Test)
  console.log('\n=== TEST 5: No Changes (Control Test) ===');
  
  const snapshot6 = createCallSnapshot(baseCallData, baseExtraData);
  const hasChanges5 = detectCallChanges(snapshot1, snapshot6);
  
  console.log(`Result: ${hasChanges5 ? '❌ CHANGE DETECTED' : '✅ NO CHANGE DETECTED'}`);
  console.log(`Expected: ✅ NO CHANGE DETECTED (identical data)`);

  // Test 6: Complex Unit Status Change
  console.log('\n=== TEST 6: Complex Unit Status Change ===');
  
  const modifiedExtraData6 = {
    Data: {
      Dispatches: [
        {
          Id: 1,
          Name: 'UNIT1',
          Type: 'Ambulance',
          Status: 'Arrived',
          DispatchTime: '2025-06-08T20:01:00.000Z',
          EnRouteTime: '2025-06-08T20:03:00.000Z',
          ArrivedTime: '2025-06-08T20:10:00.000Z'
        }
      ],
      Activity: [
        {
          Id: 1,
          UnitId: 1,
          UnitName: 'UNIT1',
          Type: 'StatusChange',
          Status: 'Arrived',
          Timestamp: '2025-06-08T20:10:00.000Z'
        }
      ]
    }
  };
  
  const snapshot7 = createCallSnapshot(baseCallData, modifiedExtraData6);
  const hasChanges6 = detectCallChanges(snapshot1, snapshot7);
  
  console.log(`Result: ${hasChanges6 ? '✅ CHANGE DETECTED' : '❌ NO CHANGE DETECTED'}`);
  console.log(`Expected: ✅ CHANGE DETECTED (unit status and activity added)`);

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));
  
  const tests = [
    { name: 'Unit Assignment Changes', result: hasChanges1, expected: true },
    { name: 'Unit Timing Changes', result: hasChanges2, expected: true },
    { name: 'Address Changes', result: hasChanges3, expected: true },
    { name: 'GPS Coordinate Changes', result: hasChanges4, expected: true },
    { name: 'No Changes (Control)', result: hasChanges5, expected: false },
    { name: 'Complex Unit Status Change', result: hasChanges6, expected: true }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach((test, index) => {
    const status = test.result === test.expected ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${test.name}: ${status}`);
    if (test.result === test.expected) passed++;
  });
  
  console.log('\n' + '-'.repeat(60));
  console.log(`Overall Result: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 ALL TESTS PASSED - Change detection working correctly!');
    console.log('✅ XML will be regenerated when units, times, or addresses change');
  } else {
    console.log('🚨 SOME TESTS FAILED - Change detection needs review');
  }
  
  console.log('='.repeat(60));
}

// Run the test
testChangeDetection().catch(console.error);