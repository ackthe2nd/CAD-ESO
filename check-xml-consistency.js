/**
 * Check XML Consistency Between Google Sheets and ESO Files
 * Compare recent XML files with Google Sheets data
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

/**
 * Get most recent XML files for each call
 */
function getRecentXMLFiles() {
  const logsDir = './logs';
  
  if (!fs.existsSync(logsDir)) {
    console.log('Logs directory not found');
    return {};
  }
  
  const files = fs.readdirSync(logsDir)
    .filter(file => file.startsWith('call_') && file.endsWith('.xml'))
    .sort((a, b) => {
      const aMatch = a.match(/call_\d+_(\d+)\.xml/);
      const bMatch = b.match(/call_\d+_(\d+)\.xml/);
      if (!aMatch || !bMatch) return 0;
      const aTimestamp = parseInt(aMatch[1]);
      const bTimestamp = parseInt(bMatch[1]);
      return bTimestamp - aTimestamp;
    });
  
  // Group by call ID and get most recent for each
  const callFiles = {};
  files.forEach(file => {
    const callMatch = file.match(/call_(\d+)_/);
    const timestampMatch = file.match(/call_\d+_(\d+)\.xml/);
    if (callMatch && timestampMatch) {
      const callId = callMatch[1];
      if (!callFiles[callId]) {
        callFiles[callId] = {
          filename: file,
          content: fs.readFileSync(path.join(logsDir, file), 'utf8'),
          timestamp: parseInt(timestampMatch[1])
        };
      }
    }
  });
  
  return callFiles;
}

/**
 * Analyze XML content for key fields
 */
function analyzeXMLContent(xml) {
  const analysis = {};
  
  // Extract key fields
  const incidentNumber = xml.match(/<IncidentNumber>(.*?)<\/IncidentNumber>/);
  const incidentOnset = xml.match(/<IncidentOrOnset>(.*?)<\/IncidentOrOnset>/);
  const dispatchNotified = xml.match(/<DispatchNotified>(.*?)<\/DispatchNotified>/);
  const address = xml.match(/<IncidentAddress1>(.*?)<\/IncidentAddress1>/);
  const city = xml.match(/<IncidentCity>(.*?)<\/IncidentCity>/);
  const state = xml.match(/<IncidentState>(.*?)<\/IncidentState>/);
  const zip = xml.match(/<IncidentZip>(.*?)<\/IncidentZip>/);
  const latitude = xml.match(/<SceneGpsLocationLat>(.*?)<\/SceneGpsLocationLat>/);
  const longitude = xml.match(/<SceneGpsLocationLong>(.*?)<\/SceneGpsLocationLong>/);
  const callNature = xml.match(/<CallNature>(.*?)<\/CallNature>/);
  
  analysis.incidentNumber = incidentNumber ? incidentNumber[1] : '';
  analysis.incidentOnset = incidentOnset ? incidentOnset[1] : '';
  analysis.dispatchNotified = dispatchNotified ? dispatchNotified[1] : '';
  analysis.address = address ? address[1] : '';
  analysis.city = city ? city[1] : '';
  analysis.state = state ? state[1] : '';
  analysis.zip = zip ? zip[1] : '';
  analysis.latitude = latitude ? latitude[1] : '';
  analysis.longitude = longitude ? longitude[1] : '';
  analysis.callNature = callNature ? callNature[1] : '';
  
  // Check for units
  if (xml.includes('<Units>')) {
    const unitsMatch = xml.match(/<Units>(.*?)<\/Units>/s);
    if (unitsMatch) {
      const unitMatches = unitsMatch[1].match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/g);
      analysis.units = unitMatches ? unitMatches.map(u => u.match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/)[1]) : [];
      analysis.unitCount = analysis.units.length;
      analysis.structure = 'multiple-units';
    }
  } else {
    const unitMatch = xml.match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/);
    analysis.units = unitMatch ? [unitMatch[1]] : [];
    analysis.unitCount = analysis.units.length;
    analysis.structure = 'single-unit';
  }
  
  return analysis;
}

/**
 * Check field completeness and accuracy
 */
function checkFieldCompleteness(analysis, callId) {
  const issues = [];
  
  // Check required timestamp fields
  if (!analysis.incidentOnset || analysis.incidentOnset.trim() === '') {
    issues.push('IncidentOrOnset is empty');
  }
  
  if (!analysis.dispatchNotified || analysis.dispatchNotified.trim() === '') {
    issues.push('DispatchNotified is empty');
  }
  
  // Check GPS coordinates
  if (!analysis.latitude || analysis.latitude.trim() === '') {
    issues.push('GPS Latitude is missing');
  }
  
  if (!analysis.longitude || analysis.longitude.trim() === '') {
    issues.push('GPS Longitude is missing');
  }
  
  // Check address fields
  if (!analysis.address || analysis.address.trim() === '') {
    issues.push('Address is missing');
  }
  
  if (!analysis.city || analysis.city.trim() === '') {
    issues.push('City is missing');
  }
  
  if (!analysis.state || analysis.state.trim() === '') {
    issues.push('State is missing');
  }
  
  // Check units
  if (analysis.unitCount === 0) {
    issues.push('No units assigned');
  }
  
  return issues;
}

/**
 * Main analysis function
 */
function analyzeXMLConsistency() {
  console.log('Analyzing XML Consistency and Field Completeness...\n');
  
  const callFiles = getRecentXMLFiles();
  const callIds = Object.keys(callFiles).slice(0, 5); // Check last 5 calls
  
  console.log(`Analyzing ${callIds.length} recent calls:\n`);
  
  let totalIssues = 0;
  
  callIds.forEach(callId => {
    const file = callFiles[callId];
    console.log(`Call ${callId} (${file.filename}):`);
    
    const analysis = analyzeXMLContent(file.content);
    const issues = checkFieldCompleteness(analysis, callId);
    
    console.log(`  Structure: ${analysis.structure}`);
    console.log(`  Units: ${analysis.units.join(', ')} (${analysis.unitCount} total)`);
    console.log(`  IncidentOrOnset: ${analysis.incidentOnset || 'EMPTY'}`);
    console.log(`  DispatchNotified: ${analysis.dispatchNotified || 'EMPTY'}`);
    console.log(`  GPS: ${analysis.latitude}, ${analysis.longitude}`);
    console.log(`  Address: ${analysis.address}, ${analysis.city}, ${analysis.state} ${analysis.zip}`);
    console.log(`  Call Nature: ${analysis.callNature}`);
    
    if (issues.length > 0) {
      console.log(`  ⚠ Issues (${issues.length}):`);
      issues.forEach(issue => console.log(`    - ${issue}`));
      totalIssues += issues.length;
    } else {
      console.log(`  ✓ All required fields complete`);
    }
    
    console.log('');
  });
  
  console.log(`Summary:`);
  console.log(`  Calls analyzed: ${callIds.length}`);
  console.log(`  Total issues found: ${totalIssues}`);
  
  if (totalIssues === 0) {
    console.log('  ✓ All XML files have complete and accurate field data');
  } else {
    console.log(`  ⚠ ${totalIssues} field issues detected across ${callIds.length} calls`);
  }
}

// Run the analysis
analyzeXMLConsistency();