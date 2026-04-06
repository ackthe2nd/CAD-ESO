/**
 * Validate XML Completeness for ESO Processing
 * Check for any missing or problematic elements
 */

function validateXMLCompleteness(xmlContent) {
  console.log('DETAILED XML VALIDATION FOR ESO');
  console.log('='.repeat(40));
  
  const issues = [];
  const warnings = [];
  
  // Check for proper XML structure
  if (!xmlContent.startsWith('<?xml version="1.0" encoding="UTF-8"?>')) {
    issues.push('Missing or incorrect XML declaration');
  }
  
  // Validate root element
  if (!xmlContent.includes('<CadIncident xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">')) {
    issues.push('Missing or incorrect root element with namespace');
  }
  
  // Check required incident fields
  const requiredIncidentFields = [
    'IncidentNumber',
    'IncidentOrOnset',
    'DispatchNotified',
    'IncidentAddress1',
    'IncidentCity',
    'IncidentState',
    'IncidentZip'
  ];
  
  requiredIncidentFields.forEach(field => {
    const regex = new RegExp(`<${field}>([^<]*)</${field}>`);
    const match = xmlContent.match(regex);
    if (!match || !match[1] || match[1].trim() === '') {
      issues.push(`Missing or empty ${field}`);
    }
  });
  
  // Check GPS coordinates
  const latMatch = xmlContent.match(/<SceneGpsLocationLat>([^<]*)<\/SceneGpsLocationLat>/);
  const lonMatch = xmlContent.match(/<SceneGpsLocationLong>([^<]*)<\/SceneGpsLocationLong>/);
  
  if (!latMatch || !lonMatch || !latMatch[1] || !lonMatch[1]) {
    warnings.push('Missing GPS coordinates');
  } else {
    const lat = parseFloat(latMatch[1]);
    const lon = parseFloat(lonMatch[1]);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      issues.push('Invalid GPS coordinates');
    }
  }
  
  // Check unit information
  if (!xmlContent.includes('<Units>') || !xmlContent.includes('</Units>')) {
    issues.push('Missing Units section');
  }
  
  const unitCallSignMatch = xmlContent.match(/<EmsUnitCallSign>([^<]*)<\/EmsUnitCallSign>/);
  if (!unitCallSignMatch || !unitCallSignMatch[1] || unitCallSignMatch[1].trim() === '') {
    issues.push('Missing or empty EmsUnitCallSign');
  }
  
  const notifiedMatch = xmlContent.match(/<UnitNotifiedByDispatch>([^<]*)<\/UnitNotifiedByDispatch>/);
  if (!notifiedMatch || !notifiedMatch[1] || notifiedMatch[1].trim() === '') {
    issues.push('Missing or empty UnitNotifiedByDispatch');
  }
  
  // Check response mode
  const responseModeMatch = xmlContent.match(/<ResponseModeToScene>([^<]*)<\/ResponseModeToScene>/);
  if (!responseModeMatch || !responseModeMatch[1]) {
    warnings.push('Missing ResponseModeToScene');
  } else {
    const mode = responseModeMatch[1];
    if (mode !== '390' && mode !== '395') {
      warnings.push(`Unusual ResponseModeToScene value: ${mode}`);
    }
  }
  
  // Check for XML character encoding issues
  if (xmlContent.includes('&') && !xmlContent.includes('&amp;') && !xmlContent.includes('&lt;') && !xmlContent.includes('&gt;')) {
    const ampMatches = xmlContent.match(/&(?!amp;|lt;|gt;|quot;|apos;)/g);
    if (ampMatches) {
      issues.push('Unescaped ampersand characters detected');
    }
  }
  
  // Check timestamp format
  const timestampRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
  const incidentOnsetMatch = xmlContent.match(/<IncidentOrOnset>([^<]*)<\/IncidentOrOnset>/);
  if (incidentOnsetMatch && !timestampRegex.test(incidentOnsetMatch[1])) {
    issues.push('Invalid IncidentOrOnset timestamp format');
  }
  
  // Check for proper closing
  if (!xmlContent.includes('</CadIncident>')) {
    issues.push('Missing closing CadIncident tag');
  }
  
  return { issues, warnings };
}

function analyzeFileProcessingStatus() {
  console.log('\nFILE PROCESSING ANALYSIS:');
  console.log('From system logs:');
  console.log('1. File uploaded successfully to SFTP (1349 bytes)');
  console.log('2. XML integrity check failed with permission error');
  console.log('3. Call logged to Google Sheets successfully');
  
  console.log('\nPOSSIBLE EXPLANATIONS:');
  console.log('• ESO processed the file and moved it to archive directory');
  console.log('• SFTP account has write-only permissions (security measure)');
  console.log('• File is being processed by ESO import system');
  console.log('• ESO locks files during processing to prevent corruption');
  
  console.log('\nRECOMMENDATIONS:');
  console.log('1. Check ESO import logs/dashboard for processing status');
  console.log('2. Verify if incident appears in ESO system');
  console.log('3. Contact ESO support if files consistently disappear');
  console.log('4. Consider disabling integrity check if it\'s not essential');
}

// Test the XML
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

const { issues, warnings } = validateXMLCompleteness(xmlContent);

console.log('\nVALIDATION RESULTS:');
if (issues.length === 0) {
  console.log('✓ No critical XML issues found');
} else {
  console.log('Critical Issues:');
  issues.forEach(issue => console.log(`❌ ${issue}`));
}

if (warnings.length > 0) {
  console.log('\nWarnings:');
  warnings.forEach(warning => console.log(`⚠️  ${warning}`));
}

analyzeFileProcessingStatus();