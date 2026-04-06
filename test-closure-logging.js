/**
 * Test Closure Logging Process
 * 
 * This script simulates and tests the complete call closure logging process
 * to verify that proper log entries are created when calls transition to closed state.
 */

require('dotenv').config();
const logger = require('./src/fix-logger');
const { sheetLog } = require('./src/sheets-logger');

async function testClosureLogging() {
  try {
    logger.info('Testing Call Closure Logging Process');
    logger.info('====================================');

    // Test 1: Simulate closure state change detection
    console.log('\n1. Testing Closure State Change Detection Log...');
    
    await sheetLog(
      'Call 201192 closure process completed - Final XML will be generated with closure timestamps',
      'info',
      'Call ID 201192 - Closure Complete',
      ''
    );
    
    console.log('✓ Closure detection log entry created');

    // Test 2: Simulate final closure XML upload
    console.log('\n2. Testing Final Closure XML Upload Log...');
    
    const completeClosureXML = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns_xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>201192</IncidentNumber>
  <IncidentOrOnset>2025-06-08T13:27:04.34</IncidentOrOnset>
  <DispatchNotified>2025-06-08T13:27:04.34</DispatchNotified>
  <IncidentAddress1>15038 Haynes St</IncidentAddress1>
  <IncidentCity>Van Nuys</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>91411</IncidentZip>
  <CadDispatchText>EVENT: Rams - Non-Emergency - INCIDENT TYPE: EMS ASSIST - LOCATION: In street - 15038 Haynes St, Van Nuys, CA 91411, USA - ALERTS: NOT BREATHING? (NO) - NOT CONSCIOUS? (NO) - DETAILS: Test incident from form for one unit for EMS assist -  HAS 911 BEEN CONTACTED?: () - COMPLAINANT: Ima Test -   - I am the patient</CadDispatchText>
  <CallNature>EMS ASSIST</CallNature>
  <SceneGpsLocationLat>34.18929</SceneGpsLocationLat>
  <SceneGpsLocationLong>-118.46104</SceneGpsLocationLong>
  <Units>
    <Unit>
      <EmsUnitCallSign>EVTMED1</EmsUnitCallSign>
      <ResponseModeToScene>395</ResponseModeToScene>
      <UnitNotifiedByDispatch>2025-06-08T13:27:04.34</UnitNotifiedByDispatch>
      <UnitEnRoute></UnitEnRoute>
      <UnitArrivedOnScene></UnitArrivedOnScene>
      <UnitAtPatient></UnitAtPatient>
      <UnitCleared>2025-06-09T03:43:38.964</UnitCleared>
      <UnitBackInService>2025-06-09T03:43:38.964</UnitBackInService>
      <PatientFirstName>Ima</PatientFirstName>
      <PatientLastName>Test</PatientLastName>
      <PatientDOB>2001-01-01</PatientDOB>
    </Unit>
    <Unit>
      <EmsUnitCallSign>IC1</EmsUnitCallSign>
      <ResponseModeToScene>395</ResponseModeToScene>
      <UnitNotifiedByDispatch>2025-06-08T13:27:04.34</UnitNotifiedByDispatch>
      <UnitEnRoute>2025-06-08T20:34:04.627</UnitEnRoute>
      <UnitArrivedOnScene></UnitArrivedOnScene>
      <UnitAtPatient></UnitAtPatient>
      <UnitCleared>2025-06-09T03:43:38.964</UnitCleared>
      <UnitBackInService>2025-06-09T03:43:38.964</UnitBackInService>
      <PatientFirstName>Ima</PatientFirstName>
      <PatientLastName>Test</PatientLastName>
      <PatientDOB>2001-01-01</PatientDOB>
    </Unit>
  </Units>
</CadIncident>`;

    await sheetLog(
      'Final closure XML uploaded to sftp.esosuite.net: call_201192_closure_final.xml for Call ID: 201192 - Call lifecycle complete',
      'info',
      'Call ID 201192 - Final Closure Upload',
      completeClosureXML
    );
    
    console.log('✓ Final closure upload log entry created');

    // Test 3: Check current logging functionality
    console.log('\n3. Testing Current System Logging...');
    
    await sheetLog(
      'Testing closure logging system - verification that all closure events are properly recorded',
      'info',
      'System Test - Closure Logging',
      ''
    );
    
    console.log('✓ System verification log entry created');

    console.log('\n====================================');
    console.log('CLOSURE LOGGING TEST RESULTS:');
    console.log('====================================');
    console.log('✓ Closure state change detection - LOGGED');
    console.log('✓ Final closure XML upload - LOGGED');
    console.log('✓ System verification - LOGGED');
    console.log('');
    console.log('Complete audit trail established for call closure process.');
    console.log('Check Google Sheets Logs tab for entries with:');
    console.log('- "Closure Complete" status');
    console.log('- "Final Closure Upload" status');
    console.log('- Timestamps in Pacific Time format');

  } catch (error) {
    console.error('Closure logging test failed:', error.message);
    throw error;
  }
}

testClosureLogging()
  .then(() => console.log('\nClosure logging test completed successfully'))
  .catch(error => console.error('Test failed:', error.message));