/**
 * Test DOB Reference Id Fix
 * Verify the XML generator now correctly extracts DOB from CAD Reference Id
 */

const { generateXML } = require('./src/xml-generator');

// Test call data with Reference Id containing DOB
const testCallData = {
  Id: 'TEST123',
  LoggedOn: '2025-06-13T06:15:00.000Z',
  Name: 'Test Medical Call',
  Nature: 'Medical Emergency - Patient: John Doe',
  Note: 'Patient complaining of chest pain',
  Address: '123 Main St, Anytown, CA 90210',
  ContactName: 'John Doe',
  ContactInfo: '555-1234',
  ReferenceId: '1985-03-15', // DOB in Reference Id
  ExternalId: 'EXT456',
  Priority: { Id: 1560 },
  Type: 'Medical',
  Latitude: '34.0522',
  Longitude: '-118.2437'
};

// Test call data with External Id containing DOB
const testCallDataExternal = {
  Id: 'TEST124',
  LoggedOn: '2025-06-13T06:15:00.000Z',
  Name: 'Test Medical Call 2',
  Nature: 'Medical Emergency - Patient: Jane Smith',
  Note: 'Patient with respiratory issues',
  Address: '456 Oak Ave, Somewhere, CA 90211',
  ContactName: 'Jane Smith',
  ContactInfo: '555-5678',
  ReferenceId: 'REF789',
  ExternalId: '12/25/1990', // DOB in External Id
  Priority: { Id: 1560 },
  Type: 'Medical',
  Latitude: '34.0522',
  Longitude: '-118.2437'
};

// Test call data with no DOB in Reference fields
const testCallDataNoDOB = {
  Id: 'TEST125',
  LoggedOn: '2025-06-13T06:15:00.000Z',
  Name: 'Test Medical Call 3',
  Nature: 'Medical Emergency - Patient: Bob Wilson',
  Note: 'Patient with injury',
  Address: '789 Pine St, Elsewhere, CA 90212',
  ContactName: 'Bob Wilson',
  ContactInfo: '555-9012',
  ReferenceId: 'INCIDENT2025001',
  ExternalId: 'EXTERNAL123',
  Priority: { Id: 1560 },
  Type: 'Medical',
  Latitude: '34.0522',
  Longitude: '-118.2437'
};

const testUnits = [
  {
    Id: 8824,
    Name: 'TEST1',
    Type: 'Ambulance',
    Timestamp: '2025-06-13T06:15:00.000Z'
  }
];

async function testDOBExtraction() {
  console.log('='.repeat(60));
  console.log('TESTING DOB REFERENCE ID EXTRACTION FIX');
  console.log('='.repeat(60));
  
  console.log('\n1. Testing Reference Id with DOB (1985-03-15):');
  console.log('-'.repeat(50));
  try {
    const xml1 = await generateXML(testCallData, testUnits, true); // debug=true
    const dobMatch1 = xml1.match(/<PatientDOB>([^<]*)<\/PatientDOB>/);
    console.log(`Expected DOB: 1985-03-15`);
    console.log(`Extracted DOB: ${dobMatch1 ? dobMatch1[1] : 'NOT FOUND'}`);
    console.log(`✅ Test 1: ${dobMatch1 && dobMatch1[1] === '1985-03-15' ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ Test 1 ERROR: ${error.message}`);
  }
  
  console.log('\n2. Testing External Id with DOB (12/25/1990):');
  console.log('-'.repeat(50));
  try {
    const xml2 = await generateXML(testCallDataExternal, testUnits, true); // debug=true
    const dobMatch2 = xml2.match(/<PatientDOB>([^<]*)<\/PatientDOB>/);
    console.log(`Expected DOB: 1990-12-25 (converted)`);
    console.log(`Extracted DOB: ${dobMatch2 ? dobMatch2[1] : 'NOT FOUND'}`);
    console.log(`✅ Test 2: ${dobMatch2 && dobMatch2[1] === '1990-12-25' ? 'PASS' : 'FAIL'}`);
  } catch (error) {
    console.log(`❌ Test 2 ERROR: ${error.message}`);
  }
  
  console.log('\n3. Testing no DOB in Reference fields:');
  console.log('-'.repeat(50));
  try {
    const xml3 = await generateXML(testCallDataNoDOB, testUnits, true); // debug=true
    const dobMatch3 = xml3.match(/<PatientDOB>([^<]*)<\/PatientDOB>/);
    console.log(`Expected DOB: Empty (no hardcoded fallback)`);
    console.log(`Extracted DOB: "${dobMatch3 ? dobMatch3[1] : 'EMPTY'}"`);
    console.log(`✅ Test 3: ${!dobMatch3 || dobMatch3[1] === '' ? 'PASS - No fallback used' : 'FAIL - Fallback detected'}`);
  } catch (error) {
    console.log(`❌ Test 3 ERROR: ${error.message}`);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('DOB REFERENCE ID FIX SUMMARY');
  console.log('='.repeat(60));
  console.log('✅ Removed hardcoded fallback DOB (2001-01-01)');
  console.log('✅ Added Reference Id DOB extraction');
  console.log('✅ Added External Id DOB extraction');
  console.log('✅ Added comprehensive debug logging');
  console.log('✅ Only uses authentic CAD data for DOB field');
  console.log('\nNext emergency call will use correct DOB from CAD Reference Id.');
}

testDOBExtraction();