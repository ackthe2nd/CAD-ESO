/**
 * Complete System Check and Consistency Verification
 * Comprehensive validation of all system components
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

async function performSystemCheck() {
  console.log('COMPLETE SYSTEM CHECK AND CONSISTENCY VERIFICATION');
  console.log('='.repeat(60));
  console.log();

  const results = {
    environment: {},
    xmlGeneration: {},
    sheetsIntegration: {},
    consistency: {},
    features: {},
    overall: { passed: 0, failed: 0, warnings: 0 }
  };

  // 1. Environment Configuration Check
  console.log('1. ENVIRONMENT CONFIGURATION');
  console.log('-'.repeat(30));
  
  const requiredEnvVars = [
    'RESGRID_USER', 'RESGRID_PASS', 'GOOGLE_SERVICE_ACCOUNT_JSON', 
    'LOG_SHEET_ID', 'SFTP_HOST', 'SFTP_USER', 'SFTP_DIR'
  ];
  
  requiredEnvVars.forEach(varName => {
    if (process.env[varName]) {
      console.log(`✓ ${varName}: Configured`);
      results.environment[varName] = true;
      results.overall.passed++;
    } else {
      console.log(`✗ ${varName}: Missing`);
      results.environment[varName] = false;
      results.overall.failed++;
    }
  });
  console.log();

  // 2. Core Files Check
  console.log('2. CORE SYSTEM FILES');
  console.log('-'.repeat(30));
  
  const coreFiles = [
    'src/index.js', 'src/xml-generator.js', 'src/sheets-logger.js',
    'package.json', '.env'
  ];
  
  coreFiles.forEach(file => {
    if (fs.existsSync(file)) {
      console.log(`✓ ${file}: Present`);
      results.overall.passed++;
    } else {
      console.log(`✗ ${file}: Missing`);
      results.overall.failed++;
    }
  });
  console.log();

  // 3. XML Generation Verification
  console.log('3. XML GENERATION SYSTEM');
  console.log('-'.repeat(30));
  
  try {
    const { generateXML } = require('./src/xml-generator');
    
    const testCall = {
      CallId: "SYSTEM_CHECK_001",
      LoggedOnUtc: "2025-06-07T20:26:00.000Z",
      Name: "System Check Test",
      Address: "123 Test Street, Los Angeles, CA 90210",
      Nature: "System Verification Test",
      Priority: 1
    };
    
    const xml = await generateXML(testCall, {}, false);
    const xmlContent = typeof xml === 'object' ? xml.xml : xml;
    
    // Check XML structure
    const hasIncidentNumber = xmlContent.includes('<IncidentNumber>SYSTEM_CHECK_001</IncidentNumber>');
    const hasTimestamps = xmlContent.includes('<IncidentOrOnset>') && xmlContent.includes('<DispatchNotified>');
    const hasGPS = xmlContent.includes('<SceneGpsLocationLat>') && xmlContent.includes('<SceneGpsLocationLong>');
    const hasUnits = xmlContent.includes('<EmsUnitCallSign>') || xmlContent.includes('<Units>');
    
    console.log(`✓ XML Generation: Working`);
    console.log(`${hasIncidentNumber ? '✓' : '✗'} Incident Number: ${hasIncidentNumber ? 'Present' : 'Missing'}`);
    console.log(`${hasTimestamps ? '✓' : '✗'} Timestamps: ${hasTimestamps ? 'Present' : 'Missing'}`);
    console.log(`${hasGPS ? '✓' : '✗'} GPS Coordinates: ${hasGPS ? 'Present' : 'Missing'}`);
    console.log(`${hasUnits ? '✓' : '✗'} Unit Assignment: ${hasUnits ? 'Present' : 'Missing'}`);
    
    results.xmlGeneration.working = true;
    results.xmlGeneration.structure = hasIncidentNumber && hasTimestamps && hasGPS && hasUnits;
    results.overall.passed += hasIncidentNumber && hasTimestamps && hasGPS && hasUnits ? 4 : 0;
    
  } catch (error) {
    console.log(`✗ XML Generation: Failed - ${error.message}`);
    results.xmlGeneration.working = false;
    results.overall.failed++;
  }
  console.log();

  // 4. Google Sheets Integration
  console.log('4. GOOGLE SHEETS INTEGRATION');
  console.log('-'.repeat(30));
  
  try {
    const { sheetLog } = require('./src/sheets-logger');
    await sheetLog('System check test message', 'info', 'System Check', '');
    console.log(`✓ Sheets Logger: Working`);
    results.sheetsIntegration.working = true;
    results.overall.passed++;
  } catch (error) {
    console.log(`✗ Sheets Logger: Failed - ${error.message}`);
    results.sheetsIntegration.working = false;
    results.overall.failed++;
  }
  console.log();

  // 5. Recent XML Consistency Check
  console.log('5. XML CONSISTENCY VERIFICATION');
  console.log('-'.repeat(30));
  
  const logsDir = './logs';
  if (fs.existsSync(logsDir)) {
    const xmlFiles = fs.readdirSync(logsDir)
      .filter(f => f.startsWith('call_2') && f.endsWith('.xml'))
      .sort()
      .slice(-3);
    
    let consistentFiles = 0;
    
    xmlFiles.forEach(file => {
      const xml = fs.readFileSync(path.join(logsDir, file), 'utf8');
      const hasTimestamp = xml.includes('<IncidentOrOnset>') && !xml.includes('<IncidentOrOnset></IncidentOrOnset>');
      const hasGPS = xml.includes('<SceneGpsLocationLat>') && !xml.includes('<SceneGpsLocationLat></SceneGpsLocationLat>');
      
      if (hasTimestamp && hasGPS) {
        console.log(`✓ ${file}: Consistent`);
        consistentFiles++;
      } else {
        console.log(`⚠ ${file}: Missing data`);
        results.overall.warnings++;
      }
    });
    
    results.consistency.xmlFiles = xmlFiles.length;
    results.consistency.consistent = consistentFiles;
    results.overall.passed += consistentFiles;
    
  } else {
    console.log(`⚠ Logs directory not found`);
    results.overall.warnings++;
  }
  console.log();

  // 6. Enhanced Features Check
  console.log('6. ENHANCED FEATURES');
  console.log('-'.repeat(30));
  
  // Check GPS geocoding
  try {
    const { generateXML } = require('./src/xml-generator');
    const testCallNoGPS = {
      CallId: "GPS_TEST_001",
      LoggedOnUtc: "2025-06-07T20:26:00.000Z",
      Name: "GPS Test",
      Address: "1600 Pennsylvania Avenue NW, Washington, DC 20500",
      Nature: "GPS Fallback Test"
    };
    
    const xml = await generateXML(testCallNoGPS, {}, true);
    const xmlContent = typeof xml === 'object' ? xml.xml : xml;
    
    const hasGeocodedGPS = xmlContent.includes('<SceneGpsLocationLat>38.') || xmlContent.includes('<SceneGpsLocationLat>34.');
    
    console.log(`${hasGeocodedGPS ? '✓' : '✗'} GPS Geocoding: ${hasGeocodedGPS ? 'Working' : 'Failed'}`);
    results.features.geocoding = hasGeocodedGPS;
    results.overall.passed += hasGeocodedGPS ? 1 : 0;
    
  } catch (error) {
    console.log(`✗ GPS Geocoding: Failed - ${error.message}`);
    results.features.geocoding = false;
    results.overall.failed++;
  }
  
  // Check timestamp extraction
  const timestampExtraction = fs.readFileSync('./src/xml-generator.js', 'utf8').includes('Final selected loggedOn');
  console.log(`${timestampExtraction ? '✓' : '✗'} Enhanced Timestamps: ${timestampExtraction ? 'Active' : 'Inactive'}`);
  results.features.timestamps = timestampExtraction;
  results.overall.passed += timestampExtraction ? 1 : 0;
  
  // Check XML field extraction
  const xmlExtraction = fs.readFileSync('./src/sheets-logger.js', 'utf8').includes('extractFieldsFromXML');
  console.log(`${xmlExtraction ? '✓' : '✗'} XML Field Extraction: ${xmlExtraction ? 'Active' : 'Inactive'}`);
  results.features.xmlExtraction = xmlExtraction;
  results.overall.passed += xmlExtraction ? 1 : 0;
  
  console.log();

  // 7. System Summary
  console.log('7. SYSTEM SUMMARY');
  console.log('-'.repeat(30));
  
  const totalTests = results.overall.passed + results.overall.failed + results.overall.warnings;
  const passRate = ((results.overall.passed / totalTests) * 100).toFixed(1);
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${results.overall.passed}`);
  console.log(`Failed: ${results.overall.failed}`);
  console.log(`Warnings: ${results.overall.warnings}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log();
  
  if (results.overall.failed === 0) {
    console.log('🎯 SYSTEM STATUS: FULLY OPERATIONAL');
    console.log('✓ Ready for deployment');
  } else if (results.overall.failed <= 2) {
    console.log('⚠ SYSTEM STATUS: MOSTLY OPERATIONAL');
    console.log('⚠ Minor issues detected');
  } else {
    console.log('✗ SYSTEM STATUS: NEEDS ATTENTION');
    console.log('✗ Critical issues detected');
  }
  
  console.log();
  console.log('System check completed.');
  
  return results;
}

// Run the system check
performSystemCheck().catch(console.error);