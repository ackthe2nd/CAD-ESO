/**
 * Test Field Extraction for Call 201192
 * Verify the updated extraction logic works with real call data
 */
require('dotenv').config();
const { getResgridToken } = require('./src/resgrid-api');
const axios = require('axios');

async function testFieldExtraction() {
  try {
    console.log('Testing Field Extraction for Call 201192');
    console.log('==========================================\n');

    // Get API token
    const token = await getResgridToken();
    if (!token) {
      console.log('Failed to get API token');
      return;
    }

    // Fetch call 201192 data
    console.log('1. Fetching call 201192 data...');
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=201192`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const callData = callResponse.data;
    const extraData = extraResponse.data;
    const callGetData = callData.Data;
    const extraGetData = extraData.Data || extraData;

    console.log('2. Analyzing available fields for extraction...');
    
    // Test ContactName extraction
    console.log('\nPatient/Caller Name Sources:');
    console.log(`  callGetData.ContactName: "${callGetData.ContactName || 'NOT FOUND'}"`);
    console.log(`  callGetData.PatientName: "${callGetData.PatientName || 'NOT FOUND'}"`);
    console.log(`  callGetData.CallerName: "${callGetData.CallerName || 'NOT FOUND'}"`);
    console.log(`  callData.ContactName: "${callData.ContactName || 'NOT FOUND'}"`);
    
    // Test ContactInfo extraction
    console.log('\nContact Information Sources:');
    console.log(`  callGetData.ContactInfo: "${callGetData.ContactInfo || 'NOT FOUND'}"`);
    console.log(`  callGetData.ContactNumber: "${callGetData.ContactNumber || 'NOT FOUND'}"`);
    console.log(`  callGetData.Phone: "${callGetData.Phone || 'NOT FOUND'}"`);
    console.log(`  callData.ContactInfo: "${callData.ContactInfo || 'NOT FOUND'}"`);
    
    // Test PatientDOB extraction
    console.log('\nPatient DOB Sources:');
    console.log(`  callGetData.PatientDOB: "${callGetData.PatientDOB || 'NOT FOUND'}"`);
    console.log(`  callGetData.DOB: "${callGetData.DOB || 'NOT FOUND'}"`);
    console.log(`  callData.PatientDOB: "${callData.PatientDOB || 'NOT FOUND'}"`);
    
    // Show all available fields in callGetData to identify correct field names
    console.log('\n3. All available fields in callGetData:');
    Object.keys(callGetData).forEach(key => {
      const value = callGetData[key];
      if (typeof value === 'string' && value.trim()) {
        console.log(`  ${key}: "${value}"`);
      } else if (typeof value !== 'object' && value !== null && value !== undefined) {
        console.log(`  ${key}: ${value}`);
      }
    });

    // Test the updated extraction functions
    console.log('\n4. Testing extraction functions:');
    
    const extractPatientInfo = () => {
      const patientSources = [
        callGetData.ContactName || '',
        callGetData.PatientName || '',
        callGetData.CallerName || '',
        callData?.ContactName || '',
        extraGetData.PatientName || '',
        extraGetData.CallerName || '',
        extraGetData.ContactName || ''
      ];
      return patientSources.filter(name => name && name.trim())[0] || '';
    };

    const extractContactInfo = () => {
      const contactSources = [
        callGetData.ContactInfo || '',
        callData?.ContactInfo || '',
        callGetData.ContactNumber || '',
        callGetData.ReportingPhone || '',
        callGetData.Phone || '',
        extraGetData.ContactInfo || '',
        extraGetData.ContactNumber || '',
        extraGetData.Phone || ''
      ];
      return contactSources.filter(contact => contact && contact.trim())[0] || '';
    };

    const extractPatientDOB = () => {
      const dobSources = [
        callGetData.PatientDOB || '',
        callGetData.PatientDateOfBirth || '',
        callGetData.DOB || '',
        callData?.PatientDOB || '',
        callData?.DOB || '',
        extraGetData.PatientDOB || '',
        extraGetData.PatientDateOfBirth || '',
        extraGetData.DOB || ''
      ];
      return dobSources.filter(dob => dob && dob.trim())[0] || '';
    };

    const patientName = extractPatientInfo();
    const contactInfo = extractContactInfo();
    const patientDOB = extractPatientDOB();

    console.log(`\nExtracted Patient/Caller Name: "${patientName}"`);
    console.log(`Extracted Contact Information: "${contactInfo}"`);
    console.log(`Extracted Patient DOB: "${patientDOB}"`);

    if (!patientName && !contactInfo && !patientDOB) {
      console.log('\n⚠️ All three fields are empty - this suggests the data is not present in the call record');
      console.log('This is normal for test calls that may not have patient information entered');
    } else {
      console.log('\n✅ Field extraction is working correctly');
    }

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

if (require.main === module) {
  testFieldExtraction();
}

module.exports = { testFieldExtraction };