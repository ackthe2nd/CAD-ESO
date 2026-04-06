/**
 * Analyze ESO XML Requirements
 * Focus on actual ESO processing requirements, not assumed requirements
 */

function analyzeXMLStructure(xmlContent) {
  console.log('ESO XML STRUCTURE ANALYSIS');
  console.log('='.repeat(50));
  
  // Check required vs optional fields based on ESO documentation
  const requiredFields = [
    'IncidentNumber',
    'IncidentOrOnset', 
    'DispatchNotified',
    'IncidentAddress1',
    'EmsUnitCallSign',
    'UnitNotifiedByDispatch'
  ];
  
  const presentFields = [];
  const missingFields = [];
  
  requiredFields.forEach(field => {
    const pattern = new RegExp(`<${field}>([^<]+)</${field}>`, 'g');
    const match = pattern.exec(xmlContent);
    if (match && match[1].trim() !== '') {
      presentFields.push(`✓ ${field}: ${match[1]}`);
    } else {
      missingFields.push(`❌ ${field}: Missing or empty`);
    }
  });
  
  console.log('\nREQUIRED FIELDS STATUS:');
  presentFields.forEach(field => console.log(field));
  if (missingFields.length > 0) {
    missingFields.forEach(field => console.log(field));
  }
  
  // Check XML namespace and schema
  console.log('\nXML STRUCTURE:');
  if (xmlContent.includes('xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"')) {
    console.log('✓ XML namespace present');
  } else {
    console.log('❌ XML namespace missing');
  }
  
  if (xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>')) {
    console.log('✓ XML declaration present');
  } else {
    console.log('❌ XML declaration missing');
  }
  
  // Check for data validation issues
  console.log('\nDATA VALIDATION:');
  
  // Check coordinates
  const latMatch = xmlContent.match(/<SceneGpsLocationLat>([^<]+)<\/SceneGpsLocationLat>/);
  const longMatch = xmlContent.match(/<SceneGpsLocationLong>([^<]+)<\/SceneGpsLocationLong>/);
  
  if (latMatch && longMatch) {
    const lat = parseFloat(latMatch[1]);
    const long = parseFloat(longMatch[1]);
    if (lat >= -90 && lat <= 90 && long >= -180 && long <= 180) {
      console.log('✓ Valid GPS coordinates');
    } else {
      console.log('❌ Invalid GPS coordinates');
    }
  }
  
  // Check incident number format
  const incidentMatch = xmlContent.match(/<IncidentNumber>([^<]+)<\/IncidentNumber>/);
  if (incidentMatch) {
    const incidentNum = incidentMatch[1];
    if (incidentNum.match(/^\d+$/)) {
      console.log('✓ Valid incident number format');
    } else {
      console.log('⚠️  Incident number not numeric');
    }
  }
  
  // Check timestamp format
  const timestampMatch = xmlContent.match(/<IncidentOrOnset>([^<]+)<\/IncidentOrOnset>/);
  if (timestampMatch) {
    const timestamp = timestampMatch[1];
    if (timestamp.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      console.log('✓ Valid ISO timestamp format');
    } else {
      console.log('❌ Invalid timestamp format');
    }
  }
  
  return { presentFields, missingFields };
}

function checkCommonESOIssues(xmlContent) {
  console.log('\nCOMMON ESO PROCESSING ISSUES:');
  
  const issues = [];
  
  // File size check
  if (xmlContent.length < 500) {
    issues.push('⚠️  XML file very small - may lack sufficient data');
  }
  
  // Check for special characters
  if (xmlContent.includes('&') && !xmlContent.includes('&amp;')) {
    issues.push('❌ Unescaped ampersand characters');
  }
  
  // Check for proper XML closing
  if (!xmlContent.includes('</CadIncident>')) {
    issues.push('❌ Missing closing CadIncident tag');
  }
  
  // Check for empty critical fields
  if (xmlContent.includes('<IncidentAddress1></IncidentAddress1>')) {
    issues.push('❌ Empty incident address');
  }
  
  // Check response mode
  const responseModeMatch = xmlContent.match(/<ResponseModeToScene>([^<]+)<\/ResponseModeToScene>/);
  if (responseModeMatch) {
    const mode = responseModeMatch[1];
    if (mode === '395' || mode === '390') {
      console.log('✓ Valid response mode');
    } else {
      issues.push('⚠️  Unusual response mode value');
    }
  }
  
  if (issues.length === 0) {
    console.log('✓ No common ESO issues detected');
  } else {
    issues.forEach(issue => console.log(issue));
  }
  
  return issues;
}

function provideFocusedRecommendations() {
  console.log('\nFOCUSED ESO TROUBLESHOOTING:');
  console.log('Since ESO doesn\'t require unit progression timestamps:');
  console.log('');
  console.log('1. XML FORMAT VALIDATION:');
  console.log('   - Verify XML is well-formed and valid');
  console.log('   - Check all tags are properly closed');
  console.log('   - Ensure special characters are escaped');
  console.log('');
  console.log('2. REQUIRED DATA PRESENCE:');
  console.log('   - IncidentNumber must be present and valid');
  console.log('   - Address fields must be populated');
  console.log('   - Unit identifier must be present');
  console.log('');
  console.log('3. ESO SYSTEM CONFIGURATION:');
  console.log('   - Verify ESO import settings accept this format');
  console.log('   - Check if ESO has specific field requirements');
  console.log('   - Confirm SFTP directory permissions are correct');
  console.log('');
  console.log('4. FILE PROCESSING:');
  console.log('   - Check if ESO processes files immediately or in batches');
  console.log('   - Verify file naming convention requirements');
  console.log('   - Confirm file is not being moved/deleted before processing');
}

// Analyze the XML
const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <IncidentNumber>201576</IncidentNumber>
  <IncidentOrOnset>2025-06-12T23:20:01.417</IncidentOrOnset>
  <DispatchNotified>2025-06-12T23:20:01.417</DispatchNotified>
  <IncidentAddress1>6950 Burnet Ave</IncidentAddress1>
  <IncidentCity>Van Nuys</IncidentCity>
  <IncidentState>CA</IncidentState>
  <IncidentZip>91405</IncidentZip>
  <CadDispatchText>EVENT: Other - Test - INCIDENT TYPE: GENERAL MEDICAL - DETAILS: 23yo Male Patient @ - COMPLAINANT: I am part of the event medical team</CadDispatchText>
  <CallNature>GENERAL MEDICAL</CallNature>
  <SceneGpsLocationLat>34.197221036810525</SceneGpsLocationLat>
  <SceneGpsLocationLong>-118.4624564412716</SceneGpsLocationLong>
  <Units>
    <Unit>
      <EmsUnitCallSign>STN1</EmsUnitCallSign>
      <ResponseModeToScene>395</ResponseModeToScene>
      <UnitNotifiedByDispatch>2025-06-12T23:20:01.417</UnitNotifiedByDispatch>
      <UnitEnRoute></UnitEnRoute>
      <UnitArrivedOnScene></UnitArrivedOnScene>
      <UnitAtPatient></UnitAtPatient>
      <UnitCleared></UnitCleared>
      <UnitBackInService></UnitBackInService>
      <PatientFirstName>Gerald</PatientFirstName>
      <PatientLastName>Smart</PatientLastName>
      <PatientDOB></PatientDOB>
    </Unit>
  </Units>
</CadIncident>`;

analyzeXMLStructure(xmlContent);
checkCommonESOIssues(xmlContent);
provideFocusedRecommendations();