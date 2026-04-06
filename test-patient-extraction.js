/**
 * Test Enhanced Patient Information Extraction
 * Validates extraction when caller identifies as patient or medical team
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator.js');

async function testPatientExtraction() {
  console.log('Testing Enhanced Patient Information Extraction');
  console.log('================================================');

  // Test Case 1: "I am the patient" scenario
  const testCase1 = {
    callData: {
      CallId: '201230',
      Name: 'PATIENT CHECK IN',
      Nature: 'EVENT: Patient Check - INCIDENT TYPE: EMS ASSIST - LOCATION: In clinic - 44.96712369999999, -93.2848906 - ALERTS: NOT BREATHING? (NO) - NOT CONSCIOUS? (NO) - DETAILS: Patient check in routine - HAS 911 BEEN CONTACTED?: (NO) - COMPLAINANT: John Smith - How are you involved in the incident?: I am the patient',
      Note: 'Patient requires routine check. Caller states: I am the patient. DOB: 03/15/1990',
      Address: '123 Main St, Minneapolis, MN 55401',
      ContactName: 'John Smith',
      LoggedOn: '2025-06-08T21:08:53.753',
      State: 0
    },
    extraData: {
      Data: {
        Dispatches: [{ Name: 'IC1', Type: 'Unit' }],
        Activity: []
      }
    }
  };

  console.log('\nTest Case 1: "I am the patient" scenario');
  console.log('==========================================');
  const xml1 = await generateXML(testCase1.callData, testCase1.extraData, true);
  const xmlString1 = typeof xml1 === 'object' ? xml1.xml : xml1;
  
  console.log('Patient name extraction check:');
  console.log('- PatientFirstName:', xmlString1.includes('<PatientFirstName>John</PatientFirstName>') ? 'FOUND' : 'MISSING');
  console.log('- PatientLastName:', xmlString1.includes('<PatientLastName>Smith</PatientLastName>') ? 'FOUND' : 'MISSING');
  console.log('- PatientDOB:', xmlString1.includes('<PatientDOB>1990-03-15</PatientDOB>') ? 'FOUND' : 'MISSING');

  // Test Case 2: "I am part of the event medical team" scenario
  const testCase2 = {
    callData: {
      CallId: '201231',
      Name: 'MEDICAL TEAM EVENT',
      Nature: 'EVENT: Medical Support - INCIDENT TYPE: EMS ASSIST - LOCATION: Event venue - DETAILS: Medical team member requesting backup - COMPLAINANT: Dr. Sarah Johnson - How are you involved in the incident?: I am part of the event medical team',
      Note: 'Medical team member on scene. Caller: Dr. Sarah Johnson. Date of birth: 08/22/1985. Additional support needed.',
      Address: '456 Event Way, Minneapolis, MN 55402',
      ContactName: 'Dr. Sarah Johnson',
      LoggedOn: '2025-06-08T22:15:30.000',
      State: 0
    },
    extraData: {
      Data: {
        Dispatches: [{ Name: 'EVTMED1', Type: 'Unit' }],
        Activity: []
      }
    }
  };

  console.log('\nTest Case 2: "I am part of the event medical team" scenario');
  console.log('========================================================');
  const xml2 = await generateXML(testCase2.callData, testCase2.extraData, true);
  const xmlString2 = typeof xml2 === 'object' ? xml2.xml : xml2;
  
  console.log('Patient name extraction check:');
  console.log('- PatientFirstName:', xmlString2.includes('<PatientFirstName>Sarah</PatientFirstName>') ? 'FOUND' : 'MISSING');
  console.log('- PatientLastName:', xmlString2.includes('<PatientLastName>Johnson</PatientLastName>') ? 'FOUND' : 'MISSING');
  console.log('- PatientDOB:', xmlString2.includes('<PatientDOB>1985-08-22</PatientDOB>') ? 'FOUND' : 'MISSING');

  // Test Case 3: Regular caller (not patient or medical team)
  const testCase3 = {
    callData: {
      CallId: '201232',
      Name: 'EMERGENCY CALL',
      Nature: 'EVENT: Emergency - INCIDENT TYPE: MEDICAL - LOCATION: Home - DETAILS: Caller reporting injured person - COMPLAINANT: Mike Wilson',
      Note: 'Third party caller reporting emergency. Patient is someone else.',
      Address: '789 Oak Ave, Minneapolis, MN 55403',
      ContactName: 'Mike Wilson',
      LoggedOn: '2025-06-08T23:30:15.000',
      State: 0
    },
    extraData: {
      Data: {
        Dispatches: [{ Name: 'EVTMED2', Type: 'Unit' }],
        Activity: []
      }
    }
  };

  console.log('\nTest Case 3: Regular caller (not patient or medical team)');
  console.log('=======================================================');
  const xml3 = await generateXML(testCase3.callData, testCase3.extraData, true);
  const xmlString3 = typeof xml3 === 'object' ? xml3.xml : xml3;
  
  console.log('Patient name extraction check (should be empty):');
  console.log('- PatientFirstName:', xmlString3.includes('<PatientFirstName></PatientFirstName>') ? 'CORRECTLY EMPTY' : 'INCORRECTLY FILLED');
  console.log('- PatientLastName:', xmlString3.includes('<PatientLastName></PatientLastName>') ? 'CORRECTLY EMPTY' : 'INCORRECTLY FILLED');
  console.log('- PatientDOB:', xmlString3.includes('<PatientDOB></PatientDOB>') ? 'CORRECTLY EMPTY' : 'INCORRECTLY FILLED');

  console.log('\n================================================');
  console.log('Patient Information Extraction Test Complete');
  console.log('================================================');
}

// Run the test
testPatientExtraction().catch(console.error);