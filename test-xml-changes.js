/**
 * Test XML Format Changes
 * 
 * This script generates sample XML before and after format changes
 * to verify the changes have been properly implemented.
 */
require('dotenv').config();
const { generateXML } = require('./src/xml-generator');

/**
 * Simple test function to show XML differences
 */
function testXmlChanges() {
  console.log('Testing XML Format Changes');
  console.log('==========================');
  
  // Sample call data with all fields set
  const callData = {
    Data: {
      CallId: '198513',
      LoggedOn: '2025-05-09T10:15:30',
      Name: 'PERSON DOWN',
      Nature: 'Fall victim',
      Note: 'Elderly patient fell in bathroom',
      Address: '11401 Chalon Rd, Los Angeles, CA 90049, USA',
      Type: 'Medical',
      ContactName: 'John Smith',
      ContactInfo: '555-123-4567',
      ExternalId: '1980-04-15',
      UnitsCsv: 'STN1,STN2',
      Priority: 1560,
      Geolocation: '34.123456,-118.456789'
    }
  };
  
  // Sample extra data
  const extraData = {
    Data: {
      Dispatches: [
        {
          Type: 'Unit',
          Name: 'STN1',
          EnRouteTime: '2025-05-09T10:20:30',
          ArrivedTime: '2025-05-09T10:35:45',
          AtPatientTime: '2025-05-09T10:38:20',
          ClearedTime: '2025-05-09T11:15:10'
        }
      ],
      Activity: [
        {
          Type: 'Unit',
          Name: 'STN1',
          StatusId: 5,
          StatusText: 'En Route',
          Timestamp: '2025-05-09T10:20:30'
        },
        {
          Type: 'Unit',
          Name: 'STN1',
          StatusId: 6,
          StatusText: 'On Scene',
          Timestamp: '2025-05-09T10:35:45'
        },
        {
          Type: 'Unit',
          Name: 'STN1',
          StatusId: 3,
          StatusText: 'At Patient',
          Timestamp: '2025-05-09T10:38:20'
        },
        {
          Type: 'Unit',
          Name: 'STN1',
          StatusId: 2,
          StatusText: 'Available',
          Timestamp: '2025-05-09T11:15:10'
        }
      ]
    }
  };
  
  // Generate XML with the changes
  const xml = generateXML(callData, extraData);
  
  // Output the XML
  console.log(xml);
  console.log('\n');
  
  // Verify changes were applied correctly
  const checks = [
    { name: 'GUID Removed', pass: !xml.includes('<Guid>'), expected: 'No Guid tag' },
    { name: 'ComplaintReportedByDispatch Removed', pass: !xml.includes('<ComplaintReportedByDispatch>'), expected: 'No ComplaintReportedByDispatch tag' },
    { name: 'PatientPhone Removed', pass: !xml.includes('<PatientPhone>'), expected: 'No PatientPhone tag' },
    { name: 'IncidentAddress1 Format', pass: xml.includes('<IncidentAddress1>11401 Chalon Rd</IncidentAddress1>'), expected: 'Only street address in IncidentAddress1' },
    { name: 'UnitNotifiedByDispatch as DateTime', pass: xml.includes('<UnitNotifiedByDispatch>2025-05-09T10:15:30</UnitNotifiedByDispatch>'), expected: 'DateTime in UnitNotifiedByDispatch' },
    { name: 'PatientDOB Format', pass: xml.includes('<PatientDOB>1980-04-15</PatientDOB>'), expected: 'YYYY-MM-DD format in PatientDOB' }
  ];
  
  // Display verification results
  console.log('Verification Results:');
  console.log('====================');
  let allPassed = true;
  
  checks.forEach(check => {
    const result = check.pass ? '✅ PASS' : '❌ FAIL';
    console.log(`${result} - ${check.name}: ${check.expected}`);
    if (!check.pass) allPassed = false;
  });
  
  console.log('\nOverall Result:', allPassed ? '✅ All changes verified' : '❌ Some changes not verified');
}

// Run the test
testXmlChanges();