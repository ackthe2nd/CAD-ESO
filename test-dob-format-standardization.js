/**
 * Test DOB Format Standardization to YYYY-MM-DD
 * Verify all DOB extraction methods convert to final YYYY-MM-DD format for XML upload
 */

const { generateXML } = require('./src/xml-generator');

const testCases = [
  {
    name: 'Reference Id with YYYY-MM-DD format',
    callData: {
      Id: 'TEST1',
      LoggedOn: '2025-06-13T06:25:00.000Z',
      Name: 'Test Call 1',
      Nature: 'Medical Emergency',
      Note: 'Patient needs assistance',
      Address: '123 Main St, City, CA 90210',
      ContactName: 'John Doe',
      ReferenceId: '1985-03-15',
      ExternalId: 'EXT001',
      Priority: { Id: 1560 }
    },
    expectedDOB: '1985-03-15'
  },
  {
    name: 'Reference Id with MM/DD/YYYY format',
    callData: {
      Id: 'TEST2',
      LoggedOn: '2025-06-13T06:25:00.000Z',
      Name: 'Test Call 2',
      Nature: 'Medical Emergency',
      Note: 'Patient emergency',
      Address: '456 Oak Ave, City, CA 90211',
      ContactName: 'Jane Smith',
      ReferenceId: '03/15/1985',
      ExternalId: 'EXT002',
      Priority: { Id: 1560 }
    },
    expectedDOB: '1985-03-15'
  },
  {
    name: 'Reference Id with M/D/YYYY format',
    callData: {
      Id: 'TEST3',
      LoggedOn: '2025-06-13T06:25:00.000Z',
      Name: 'Test Call 3',
      Nature: 'Medical Emergency',
      Note: 'Patient emergency',
      Address: '789 Pine St, City, CA 90212',
      ContactName: 'Bob Wilson',
      ReferenceId: '3/5/1990',
      ExternalId: 'EXT003',
      Priority: { Id: 1560 }
    },
    expectedDOB: '1990-03-05'
  },
  {
    name: 'External Id with MM/DD/YYYY format',
    callData: {
      Id: 'TEST4',
      LoggedOn: '2025-06-13T06:25:00.000Z',
      Name: 'Test Call 4',
      Nature: 'Medical Emergency',
      Note: 'Patient emergency',
      Address: '321 Elm St, City, CA 90213',
      ContactName: 'Alice Brown',
      ReferenceId: 'REF004',
      ExternalId: '12/25/1975',
      Priority: { Id: 1560 }
    },
    expectedDOB: '1975-12-25'
  },
  {
    name: 'DOB in nature text with MM/DD/YYYY',
    callData: {
      Id: 'TEST5',
      LoggedOn: '2025-06-13T06:25:00.000Z',
      Name: 'Test Call 5',
      Nature: 'Medical Emergency - DOB: 08/14/1988',
      Note: 'Patient emergency',
      Address: '654 Maple Ave, City, CA 90214',
      ContactName: 'Charlie Davis',
      ReferenceId: 'REF005',
      ExternalId: 'EXT005',
      Priority: { Id: 1560 }
    },
    expectedDOB: '1988-08-14'
  },
  {
    name: 'No DOB in any field',
    callData: {
      Id: 'TEST6',
      LoggedOn: '2025-06-13T06:25:00.000Z',
      Name: 'Test Call 6',
      Nature: 'Medical Emergency',
      Note: 'Patient emergency',
      Address: '987 Cedar Blvd, City, CA 90215',
      ContactName: 'Diana Evans',
      ReferenceId: 'INCIDENT2025001',
      ExternalId: 'EXTERNAL123',
      Priority: { Id: 1560 }
    },
    expectedDOB: ''
  }
];

const testUnits = [
  {
    Id: 8824,
    Name: 'TEST1',
    Type: 'Ambulance',
    Timestamp: '2025-06-13T06:25:00.000Z'
  }
];

async function runFormatTests() {
  console.log('='.repeat(70));
  console.log('DOB FORMAT STANDARDIZATION TEST - YYYY-MM-DD FOR XML UPLOAD');
  console.log('='.repeat(70));
  
  let passCount = 0;
  let totalTests = testCases.length;
  
  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n${i + 1}. ${testCase.name}:`);
    console.log('-'.repeat(50));
    
    try {
      const xml = await generateXML(testCase.callData, testUnits, true);
      const dobMatch = xml.match(/<PatientDOB>([^<]*)<\/PatientDOB>/);
      const extractedDOB = dobMatch ? dobMatch[1] : '';
      
      console.log(`Expected: "${testCase.expectedDOB}"`);
      console.log(`Extracted: "${extractedDOB}"`);
      
      // Check format is YYYY-MM-DD or empty
      const isValidFormat = extractedDOB === '' || /^\d{4}-\d{2}-\d{2}$/.test(extractedDOB);
      const isCorrectValue = extractedDOB === testCase.expectedDOB;
      
      if (isValidFormat && isCorrectValue) {
        console.log(`✅ PASS - Correct YYYY-MM-DD format`);
        passCount++;
      } else if (!isValidFormat) {
        console.log(`❌ FAIL - Invalid format (not YYYY-MM-DD): "${extractedDOB}"`);
      } else {
        console.log(`❌ FAIL - Wrong value: expected "${testCase.expectedDOB}", got "${extractedDOB}"`);
      }
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('DOB FORMAT STANDARDIZATION RESULTS');
  console.log('='.repeat(70));
  console.log(`Tests passed: ${passCount}/${totalTests}`);
  console.log(`Success rate: ${Math.round((passCount / totalTests) * 100)}%`);
  
  if (passCount === totalTests) {
    console.log('\n✅ ALL TESTS PASSED');
    console.log('✅ DOB format standardized to YYYY-MM-DD for XML upload');
    console.log('✅ All date formats (MM/DD/YYYY, M/D/YYYY) converted correctly');
    console.log('✅ Empty DOB when no authentic data available');
  } else {
    console.log(`\n⚠️  ${totalTests - passCount} tests failed - review format conversion logic`);
  }
  
  console.log('\nNext emergency call will use standardized YYYY-MM-DD DOB format.');
}

runFormatTests();