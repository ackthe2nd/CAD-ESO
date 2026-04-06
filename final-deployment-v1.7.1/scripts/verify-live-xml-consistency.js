/**
 * Verify Live XML Consistency 
 * Check that recent XML files have complete field data
 */

const fs = require('fs');
const path = require('path');

function analyzeRecentXML() {
  console.log('Verifying Live XML Consistency and Field Completeness...\n');
  
  const logsDir = './logs';
  const currentTime = Date.now();
  const oneHourAgo = currentTime - (60 * 60 * 1000); // 1 hour ago
  
  // Get recent XML files (last hour)
  const files = fs.readdirSync(logsDir)
    .filter(file => file.startsWith('call_2') && file.endsWith('.xml'))
    .map(file => {
      const timestampMatch = file.match(/call_\d+_(\d+)\.xml/);
      return {
        filename: file,
        timestamp: timestampMatch ? parseInt(timestampMatch[1]) : 0
      };
    })
    .filter(file => file.timestamp > oneHourAgo)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 3); // Check last 3 recent files
  
  console.log(`Checking ${files.length} XML files from the last hour:\n`);
  
  files.forEach(file => {
    const filePath = path.join(logsDir, file.filename);
    const xmlContent = fs.readFileSync(filePath, 'utf8');
    
    console.log(`${file.filename}:`);
    
    // Check key fields
    const incidentOnset = xmlContent.match(/<IncidentOrOnset>(.*?)<\/IncidentOrOnset>/)?.[1];
    const dispatchNotified = xmlContent.match(/<DispatchNotified>(.*?)<\/DispatchNotified>/)?.[1];
    const gpsLat = xmlContent.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/)?.[1];
    const gpsLon = xmlContent.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/)?.[1];
    const address = xmlContent.match(/<IncidentAddress1>(.*?)<\/IncidentAddress1>/)?.[1];
    const callNature = xmlContent.match(/<CallNature>(.*?)<\/CallNature>/)?.[1];
    
    // Extract units
    let units = [];
    if (xmlContent.includes('<Units>')) {
      const unitMatches = xmlContent.match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/g);
      units = unitMatches ? unitMatches.map(u => u.match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/)[1]) : [];
    } else {
      const unitMatch = xmlContent.match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/);
      units = unitMatch ? [unitMatch[1]] : [];
    }
    
    // Check completeness
    const checks = {
      'IncidentOrOnset': incidentOnset && incidentOnset.trim() !== '',
      'DispatchNotified': dispatchNotified && dispatchNotified.trim() !== '',
      'GPS Coordinates': gpsLat && gpsLon && gpsLat.trim() !== '' && gpsLon.trim() !== '',
      'Address': address && address.trim() !== '',
      'Call Nature': callNature && callNature.trim() !== '',
      'Units Assigned': units.length > 0
    };
    
    let allComplete = true;
    Object.entries(checks).forEach(([field, isComplete]) => {
      const status = isComplete ? '✓' : '✗';
      console.log(`  ${status} ${field}: ${isComplete ? 'Complete' : 'Missing'}`);
      if (!isComplete) allComplete = false;
    });
    
    if (allComplete) {
      console.log(`  ✓ All fields complete and consistent`);
    } else {
      console.log(`  ⚠ Some fields incomplete`);
    }
    
    console.log(`  Units: ${units.join(', ')} (${units.length} total)`);
    console.log(`  GPS: ${gpsLat || 'N/A'}, ${gpsLon || 'N/A'}`);
    console.log('');
  });
  
  console.log('Live XML consistency verification complete!');
}

analyzeRecentXML();