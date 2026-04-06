/**
 * Test Fallback Unit Assignment Feature
 * Verify that calls without assigned units receive fallback unit assignments
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator');
const fs = require('fs');

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  if (isError) {
    console.error(`${timestamp} [ERROR]: ${message}`);
  } else {
    console.log(`${timestamp} [INFO]: ${message}`);
  }
}

/**
 * Test XML generation with no units in call data
 */
function testFallbackUnits() {
  log('Testing fallback unit assignment feature...');
  
  // Create test call data with no units assigned
  const testCallData = {
    CallId: 'TEST_FALLBACK_' + Date.now(),
    Priority: null,
    Name: 'Emergency Call - No Units Assigned',
    Nature: 'Medical Emergency',
    Note: 'Testing fallback unit assignment when no specific units are found in call data',
    Address: '123 Test Street, Los Angeles, CA 90210',
    Geolocation: '',
    LoggedOn: new Date().toISOString(),
    State: 1,
    Number: 'TEST001',
    ContactName: 'Test Contact',
    ContactInfo: '555-0123',
    IncidentAddress1: '123 Test Street',
    City: 'Los Angeles',
    County: 'Los Angeles',
    Zip: '90210',
    Latitude: 34.0522,
    Longitude: -118.2437,
    UnitsCsv: '', // No units in CSV
    ResponseModeToScene: 395
  };
  
  // Create test extra data with empty dispatches and activities
  const testExtraData = {
    Data: {
      Dispatches: [], // No unit dispatches
      Activity: [],   // No unit activities
      PageSize: 50,
      Page: 1
    }
  };
  
  log('Generating XML with empty unit data...');
  
  // Generate XML with debug enabled to see fallback logic
  const xmlResult = generateXML(testCallData, testExtraData, true);
  const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
  
  log('XML generation completed');
  
  // Check if fallback was used
  if (typeof xmlResult === 'object' && xmlResult.fallbackUnitsUsed) {
    log(`✓ Fallback units activated: ${xmlResult.unitNames.join(', ')}`);
  }
  
  // Verify fallback units are included in XML
  const expectedUnits = [
    'EVTMED1', 'EVTMED2', 'SETMED1', 'SETMED2', 'STN1', 'STN2', 'STN3',
    'ERT1', 'ERT2', 'CART1', 'BIKE1', 'CMD1', 'SPT1'
  ];
  
  let fallbackUnitsFound = 0;
  expectedUnits.forEach(unit => {
    if (xml.includes(`<EmsUnitCallSign>${unit}</EmsUnitCallSign>`)) {
      fallbackUnitsFound++;
      log(`✓ Found fallback unit: ${unit}`);
    }
  });
  
  // Save XML to file for inspection
  const filename = `test_fallback_units_${Date.now()}.xml`;
  fs.writeFileSync(filename, xml);
  log(`Saved test XML to: ${filename}`);
  
  // Verify results
  if (fallbackUnitsFound > 0) {
    log(`✅ Fallback unit assignment working: ${fallbackUnitsFound} units assigned`);
    
    // Check if XML structure is correct
    if (xml.includes('<CadIncident')) {
      log('✅ XML uses correct <CadIncident> root node');
    } else {
      log('❌ XML has incorrect root node format', true);
    }
    
    // Count total incidents in XML (should match number of fallback units)
    const incidentMatches = xml.match(/<CadIncident/g);
    const incidentCount = incidentMatches ? incidentMatches.length : 0;
    
    if (incidentCount === expectedUnits.length) {
      log(`✅ XML contains ${incidentCount} incidents (one per fallback unit)`);
    } else {
      log(`⚠️  Expected ${expectedUnits.length} incidents, found ${incidentCount}`);
    }
    
  } else {
    log('❌ Fallback unit assignment failed: No units found in XML', true);
  }
  
  return {
    success: fallbackUnitsFound > 0,
    unitsAssigned: fallbackUnitsFound,
    xmlGenerated: xml.length > 0,
    filename: filename
  };
}

/**
 * Test with call data that has some units to ensure fallback doesn't interfere
 */
function testWithExistingUnits() {
  log('\nTesting with existing units (fallback should not activate)...');
  
  const testCallData = {
    CallId: 'TEST_EXISTING_' + Date.now(),
    Priority: null,
    Name: 'Emergency Call - With Assigned Units',
    Nature: 'Fire Emergency',
    Note: 'Testing that fallback does not activate when units are already assigned',
    Address: '456 Another Street, Los Angeles, CA 90211',
    Geolocation: '',
    LoggedOn: new Date().toISOString(),
    State: 1,
    Number: 'TEST002',
    ContactName: 'Test Contact 2',
    ContactInfo: '555-0124',
    IncidentAddress1: '456 Another Street',
    City: 'Los Angeles',
    County: 'Los Angeles',
    Zip: '90211',
    Latitude: 34.0523,
    Longitude: -118.2438,
    UnitsCsv: 'STN1,ERT1',
    ResponseModeToScene: 395
  };
  
  const testExtraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'STN1',
          Location: 'Station 1',
          EnRouteTime: new Date().toISOString(),
          ArrivedTime: '',
          ClearedTime: ''
        },
        {
          Type: 'Unit',
          Name: 'ERT1',
          Location: 'Station 2', 
          EnRouteTime: new Date().toISOString(),
          ArrivedTime: '',
          ClearedTime: ''
        }
      ],
      Activity: [],
      PageSize: 50,
      Page: 1
    }
  };
  
  const xmlResult = generateXML(testCallData, testExtraData, true);
  const xml = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
  
  // Verify only assigned units are present, not fallback units
  const assignedUnits = ['STN1', 'ERT1'];
  const fallbackOnlyUnits = ['EVTMED1', 'EVTMED2', 'SETMED1', 'SETMED2'];
  
  let assignedFound = 0;
  let fallbackFound = 0;
  
  assignedUnits.forEach(unit => {
    if (xml.includes(`<EmsUnitCallSign>${unit}</EmsUnitCallSign>`)) {
      assignedFound++;
      log(`✓ Found assigned unit: ${unit}`);
    }
  });
  
  fallbackOnlyUnits.forEach(unit => {
    if (xml.includes(`<EmsUnitCallSign>${unit}</EmsUnitCallSign>`)) {
      fallbackFound++;
      log(`⚠️  Unexpected fallback unit found: ${unit}`);
    }
  });
  
  if (assignedFound === assignedUnits.length && fallbackFound === 0) {
    log('✅ Fallback correctly inactive when units are assigned');
    return true;
  } else {
    log('❌ Fallback logic error: fallback activated when units already assigned', true);
    return false;
  }
}

/**
 * Main test function
 */
function main() {
  log('=== Fallback Unit Assignment Test ===');
  
  try {
    // Test 1: Fallback activation with no units
    const fallbackTest = testFallbackUnits();
    
    // Test 2: Fallback should not activate with existing units
    const existingUnitsTest = testWithExistingUnits();
    
    log('\n=== Test Results ===');
    log(`Fallback assignment test: ${fallbackTest.success ? 'PASS' : 'FAIL'}`);
    log(`Existing units test: ${existingUnitsTest ? 'PASS' : 'FAIL'}`);
    
    if (fallbackTest.success && existingUnitsTest) {
      log('\n✅ All fallback unit assignment tests PASSED');
      log('Emergency calls without assigned units will automatically receive all available units');
    } else {
      log('\n❌ Some fallback unit assignment tests FAILED', true);
    }
    
  } catch (error) {
    log(`Test execution failed: ${error.message}`, true);
    console.error(error.stack);
  }
}

main();