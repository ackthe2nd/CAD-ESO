/**
 * Quick test for professional title handling in patient name extraction
 */

require('dotenv').config();
const { generateXML } = require('./src/xml-generator.js');

async function testProfessionalTitles() {
  const testCase = {
    callData: {
      CallId: '201235',
      Name: 'MEDICAL TEAM EVENT',
      Nature: 'EVENT: Medical Support - INCIDENT TYPE: EMS ASSIST - How are you involved in the incident?: I am part of the event medical team',
      Note: 'Medical team member requesting support.',
      Address: '123 Medical Center Dr, Minneapolis, MN 55404',
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

  console.log('Testing Professional Title Handling: "Dr. Sarah Johnson"');
  const xml = await generateXML(testCase.callData, testCase.extraData, true);
  const xmlString = typeof xml === 'object' ? xml.xml : xml;
  
  console.log('Results:');
  console.log('- PatientFirstName found:', xmlString.includes('<PatientFirstName>Sarah</PatientFirstName>'));
  console.log('- PatientLastName found:', xmlString.includes('<PatientLastName>Johnson</PatientLastName>'));
  
  if (xmlString.includes('<PatientFirstName>Sarah</PatientFirstName>') && 
      xmlString.includes('<PatientLastName>Johnson</PatientLastName>')) {
    console.log('✓ Professional title handling working correctly');
  } else {
    console.log('✗ Professional title handling needs adjustment');
    console.log('XML excerpt:', xmlString.substring(xmlString.indexOf('<PatientFirstName>'), xmlString.indexOf('</PatientDOB>') + 14));
  }
}

testProfessionalTitles().catch(console.error);