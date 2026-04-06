/**
 * Analyze ESO XML Processing Issues
 * Identify why XML files might not be processed correctly by ESO
 */

const fs = require('fs');

function analyzeXMLIssues(xmlContent) {
  console.log('Analyzing XML for ESO processing issues...\n');
  
  const issues = [];
  const warnings = [];
  
  // Check for missing required timestamps
  const requiredTimestamps = [
    'UnitEnRoute',
    'UnitArrivedOnScene', 
    'UnitAtPatient',
    'UnitCleared',
    'UnitBackInService'
  ];
  
  requiredTimestamps.forEach(timestamp => {
    const pattern = new RegExp(`<${timestamp}></${timestamp}>`, 'g');
    if (pattern.test(xmlContent)) {
      issues.push(`❌ Empty ${timestamp} - ESO requires actual timestamps for call progression`);
    }
  });
  
  // Check for missing or empty patient DOB
  if (xmlContent.includes('<PatientDOB></PatientDOB>')) {
    issues.push('❌ Empty PatientDOB - ESO may require patient date of birth for medical records');
  }
  
  // Check for minimal call progression
  const hasEnRoute = !xmlContent.includes('<UnitEnRoute></UnitEnRoute>');
  const hasArrived = !xmlContent.includes('<UnitArrivedOnScene></UnitArrivedOnScene>');
  const hasAtPatient = !xmlContent.includes('<UnitAtPatient></UnitAtPatient>');
  
  if (!hasEnRoute && !hasArrived && !hasAtPatient) {
    issues.push('❌ No unit progression timestamps - ESO needs En Route, Arrived, or At Patient times');
  }
  
  // Check for proper incident closure
  if (!xmlContent.includes('<UnitCleared>') || xmlContent.includes('<UnitCleared></UnitCleared>')) {
    warnings.push('⚠️  Missing Unit Cleared time - ESO prefers complete call closure data');
  }
  
  // Check for transport information
  if (!xmlContent.includes('UnitTransport') && !xmlContent.includes('UnitAtHospital')) {
    warnings.push('⚠️  No transport information - ESO expects transport times for medical calls');
  }
  
  // Check incident classification
  if (xmlContent.includes('GENERAL MEDICAL')) {
    warnings.push('⚠️  Generic incident type - ESO prefers specific medical classifications');
  }
  
  // Check for proper patient information
  if (xmlContent.includes('I am part of the event medical team')) {
    warnings.push('⚠️  Self-identified medical team member - not a patient transport');
  }
  
  return { issues, warnings };
}

function generateRecommendations(issues, warnings) {
  console.log('ESO XML PROCESSING ANALYSIS');
  console.log('='.repeat(50));
  
  if (issues.length > 0) {
    console.log('\n🚨 CRITICAL ISSUES (likely to prevent processing):');
    issues.forEach(issue => console.log(`  ${issue}`));
  }
  
  if (warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (may affect processing):');
    warnings.forEach(warning => console.log(`  ${warning}`));
  }
  
  console.log('\n📋 RECOMMENDATIONS:');
  console.log('1. Add actual unit progression timestamps:');
  console.log('   - UnitEnRoute: When unit starts responding');
  console.log('   - UnitArrivedOnScene: When unit arrives at location');
  console.log('   - UnitAtPatient: When unit makes patient contact');
  console.log('   - UnitCleared: When unit completes call');
  
  console.log('\n2. Improve incident classification:');
  console.log('   - Use specific medical codes instead of "GENERAL MEDICAL"');
  console.log('   - Provide detailed nature of medical emergency');
  
  console.log('\n3. Complete patient information:');
  console.log('   - Add patient DOB if available in CAD Reference Id');
  console.log('   - Ensure patient vs. medical team member distinction');
  
  console.log('\n4. Add call closure information:');
  console.log('   - Include UnitBackInService timestamp');
  console.log('   - Add transport times if patient transported');
}

// Analyze the provided XML
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

const { issues, warnings } = analyzeXMLIssues(xmlContent);
generateRecommendations(issues, warnings);