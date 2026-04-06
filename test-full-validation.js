/**
 * Comprehensive full-system validation test for Resgrid to ESO Bridge
 * Tests the entire process from API call to XML generation
 * Uses real call data to ensure accuracy and proper formatting
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { generateXML } = require('./src/xml-generator');
const { generateXML: generateExactMatchXML } = require('./src/xml-generator-exact-match');

const DAYS_TO_LOOK_BACK = 7; // Default to 7 days of calls
const LOG_DIR = path.join(process.cwd(), 'logs');

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

/**
 * Create logs directory if it doesn't exist
 */
function ensureLogsDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

/**
 * Gets a valid Resgrid API token
 */
async function getApiToken() {
  const username = process.env.RESGRID_USER;
  const password = process.env.RESGRID_PASS;
  
  if (!username || !password) {
    throw new Error('Missing Resgrid credentials in environment variables');
  }
  
  try {
    log('Getting Resgrid API token...');
    const response = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (response.data && response.data.access_token) {
      log('Successfully obtained API token');
      return response.data.access_token;
    } else {
      throw new Error('Invalid response format from API');
    }
  } catch (error) {
    log(`Failed to get API token: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch recent calls from Resgrid API
 */
async function fetchRecentCalls(token, days = DAYS_TO_LOOK_BACK) {
  try {
    // Calculate date in the past
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - days);
    const formattedDate = pastDate.toISOString();
    
    log(`Fetching calls since ${formattedDate}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallsByDate?startDate=${encodeURIComponent(formattedDate)}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      const calls = response.data.Data;
      log(`Successfully fetched ${calls.length} calls from the past ${days} days`);
      return calls;
    } else {
      log('No calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Failed to fetch recent calls: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch active calls
 */
async function fetchActiveCalls(token) {
  try {
    log('Fetching active calls...');
    const response = await axios.get('https://api.resgrid.com/api/v4/Calls/GetActiveCalls', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      const calls = response.data.Data;
      log(`Successfully fetched ${calls.length} active calls`);
      return calls;
    } else {
      log('No active calls found or invalid response format', true);
      return [];
    }
  } catch (error) {
    log(`Failed to fetch active calls: ${error.message}`, true);
    throw error;
  }
}

/**
 * Fetch detailed call data for a specific call ID
 */
async function fetchCallData(token, callId) {
  try {
    log(`Fetching detailed data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched detailed data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No data found for call ${callId} or invalid response format`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch detailed call data: ${error.message}`, true);
    return null;
  }
}

/**
 * Fetch extra data for a specific call ID
 */
async function fetchCallExtraData(token, callId) {
  try {
    log(`Fetching extra data for call ${callId}...`);
    const response = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    if (response.data && response.data.Data) {
      log(`Successfully fetched extra data for call ${callId}`);
      return response.data.Data;
    } else {
      log(`No extra data found for call ${callId} or invalid response format`, true);
      return null;
    }
  } catch (error) {
    log(`Failed to fetch call extra data: ${error.message}`, true);
    return null;
  }
}

/**
 * Compare the outputs of both XML generators
 */
function compareXmlGenerators(callData, extraData, callId) {
  try {
    log(`Testing XML generators for call ${callId}...`);
    
    // Generate XML using both generators
    const standardXml = generateXML(callData, extraData);
    const exactMatchXml = generateExactMatchXML(callData, extraData);
    
    // Save both XML files for comparison
    const standardXmlPath = path.join(LOG_DIR, `call_${callId}_standard.xml`);
    const exactMatchXmlPath = path.join(LOG_DIR, `call_${callId}_exact_match.xml`);
    
    fs.writeFileSync(standardXmlPath, standardXml);
    fs.writeFileSync(exactMatchXmlPath, exactMatchXml);
    
    log(`Standard XML saved to ${standardXmlPath}`);
    log(`Exact match XML saved to ${exactMatchXmlPath}`);
    
    // Compare field values between the two XMLs
    log('Comparing key fields between XML generators:');
    const fieldsToCompare = [
      'IncidentNumber', 'IncidentOrOnset', 'IncidentAddress1', 
      'IncidentCity', 'IncidentState', 'IncidentZip',
      'UnitEnRoute', 'UnitArrivedOnScene', 'UnitBackInService',
      'PatientFirstName', 'PatientLastName'
    ];
    
    let allFieldsMatch = true;
    let fieldsComparison = {};
    
    fieldsToCompare.forEach(field => {
      const standardRegex = new RegExp(`<${field}>(.*?)</${field}>`);
      const exactRegex = new RegExp(`<${field}>(.*?)</${field}>`);
      
      const standardMatch = standardXml.match(standardRegex);
      const exactMatch = exactMatchXml.match(exactRegex);
      
      const standardValue = standardMatch ? standardMatch[1] : '';
      const exactValue = exactMatch ? exactMatch[1] : '';
      
      fieldsComparison[field] = {
        standardValue,
        exactValue,
        match: standardValue === exactValue
      };
      
      if (standardValue !== exactValue) {
        allFieldsMatch = false;
        log(`  ⚠️ Field ${field} differs between generators:`);
        log(`    Standard: "${standardValue}"`);
        log(`    Exact:    "${exactValue}"`);
      }
    });
    
    if (allFieldsMatch) {
      log('  ✓ All key fields match between both XML generators');
    }
    
    return {
      standardXml,
      exactMatchXml,
      fieldsComparison,
      allFieldsMatch
    };
  } catch (error) {
    log(`Error comparing XML generators: ${error.message}`, true);
    return null;
  }
}

/**
 * Check for specific field values in the XML
 */
function verifyXmlFields(xml, callData) {
  log('Verifying key fields in generated XML:');
  
  // Check that essential fields are populated
  const fieldsToVerify = [
    { name: 'IncidentNumber', value: callData.CallId },
    { name: 'IncidentOrOnset', value: callData.LoggedOn },
    { name: 'Guid', value: 'b394de98-a5b7-408d-a1f2-020eddff92b9' }
  ];
  
  let allFieldsVerified = true;
  
  fieldsToVerify.forEach(field => {
    const regex = new RegExp(`<${field.name}>(.*?)</${field.name}>`);
    const match = xml.match(regex);
    
    if (match && match[1] === field.value) {
      log(`  ✓ Field ${field.name} correctly set to "${field.value}"`);
    } else if (match) {
      allFieldsVerified = false;
      log(`  ⚠️ Field ${field.name} value mismatch: expected "${field.value}", got "${match[1]}"`);
    } else {
      allFieldsVerified = false;
      log(`  ❌ Field ${field.name} not found in XML or empty`);
    }
  });
  
  // Check address parsing
  const addressRegex = /<IncidentAddress1>(.*?)<\/IncidentAddress1>/;
  const addressMatch = xml.match(addressRegex);
  
  if (addressMatch && addressMatch[1]) {
    log(`  ✓ Address parsed and set to "${addressMatch[1]}"`);
    
    // Check that city, state, zip were extracted
    const cityRegex = /<IncidentCity>(.*?)<\/IncidentCity>/;
    const stateRegex = /<IncidentState>(.*?)<\/IncidentState>/;
    const zipRegex = /<IncidentZip>(.*?)<\/IncidentZip>/;
    
    const cityMatch = xml.match(cityRegex);
    const stateMatch = xml.match(stateRegex);
    const zipMatch = xml.match(zipRegex);
    
    if (cityMatch && cityMatch[1]) {
      log(`  ✓ City extracted: "${cityMatch[1]}"`);
    } else {
      log(`  ⚠️ City not extracted from address`);
    }
    
    if (stateMatch && stateMatch[1]) {
      log(`  ✓ State extracted: "${stateMatch[1]}"`);
    } else {
      log(`  ⚠️ State not extracted from address`);
    }
    
    if (zipMatch && zipMatch[1]) {
      log(`  ✓ ZIP extracted: "${zipMatch[1]}"`);
    } else {
      log(`  ⚠️ ZIP not extracted from address`);
    }
  } else {
    log(`  ⚠️ Address not found or empty in XML`);
  }
  
  // Check unit fields
  const unitName = xml.match(/<EmsUnitCallSign>(.*?)<\/EmsUnitCallSign>/);
  if (unitName && unitName[1]) {
    log(`  ✓ Unit name found: "${unitName[1]}"`);
  } else {
    log(`  ⚠️ Unit name not found or empty`);
  }
  
  // Check patient fields
  const patientFirstName = xml.match(/<PatientFirstName>(.*?)<\/PatientFirstName>/);
  const patientLastName = xml.match(/<PatientLastName>(.*?)<\/PatientLastName>/);
  
  if (patientFirstName && patientFirstName[1]) {
    log(`  ✓ Patient first name extracted: "${patientFirstName[1]}"`);
  } else {
    log(`  ⚠️ Patient first name not found or empty`);
  }
  
  if (patientLastName && patientLastName[1]) {
    log(`  ✓ Patient last name extracted: "${patientLastName[1]}"`);
  } else {
    log(`  ⚠️ Patient last name not found or empty`);
  }
  
  return allFieldsVerified;
}

/**
 * Analyze a call for unit status timings, with focus on "returning" status
 */
function analyzeUnitStatuses(callData, extraData) {
  if (!extraData || !extraData.Activity || !Array.isArray(extraData.Activity)) {
    log('No activity data found for this call');
    return null;
  }
  
  // Find a valid unit in the call
  let unitName = '';
  
  // First try to extract from UnitsCsv
  if (callData.UnitsCsv) {
    const unitsList = callData.UnitsCsv.split(',').map(u => u.trim());
    const validUnit = unitsList.find(u => u.length <= 9 && /^[a-zA-Z0-9]+$/.test(u));
    if (validUnit) {
      unitName = validUnit;
    }
  }
  
  // If no valid unit found, try Dispatches array
  if (!unitName && extraData.Dispatches && Array.isArray(extraData.Dispatches)) {
    const validUnit = extraData.Dispatches.find(d => 
      d.Type === 'Unit' && 
      d.Name && 
      d.Name.length <= 9 && 
      /^[a-zA-Z0-9]+$/.test(d.Name)
    );
    
    if (validUnit) {
      unitName = validUnit.Name;
    }
  }
  
  if (!unitName) {
    log('No valid unit name found in call data');
    return null;
  }
  
  log(`Analyzing status timings for unit: ${unitName}`);
  
  // Filter for activities for this unit
  const unitActivities = extraData.Activity.filter(a => 
    a.Type === 'Unit' && a.Name === unitName
  );
  
  if (unitActivities.length === 0) {
    log(`No activities found for unit ${unitName}`);
    return null;
  }
  
  // Sort activities by timestamp
  unitActivities.sort((a, b) => {
    const dateA = new Date(a.Timestamp);
    const dateB = new Date(b.Timestamp);
    return dateA - dateB;
  });
  
  log(`Found ${unitActivities.length} status updates for unit ${unitName}`);
  
  // Log all unit statuses
  unitActivities.forEach((activity, index) => {
    log(`  Status ${index+1}: StatusId=${activity.StatusId}, Text="${activity.StatusText || 'Unknown'}", Time=${activity.Timestamp}`);
  });
  
  // Look for specific status patterns
  const enRouteActivity = unitActivities.find(a => a.StatusId === 5);
  const onSceneActivity = unitActivities.find(a => a.StatusId === 6);
  const availableActivity = unitActivities.find(a => a.StatusId === 2);
  
  // Check for keyword-based returning status
  const returningKeywords = ['returning', 'available', 'cleared', 'in service', 'in quarter', 'complete'];
  const returningActivity = unitActivities.find(a => 
    a.StatusText && returningKeywords.some(keyword => a.StatusText.toLowerCase().includes(keyword))
  );
  
  let statusSummary = {
    unitName,
    enRoute: enRouteActivity?.Timestamp,
    onScene: onSceneActivity?.Timestamp,
    available: availableActivity?.Timestamp,
    returning: returningActivity?.Timestamp,
    hasReturningStatus: !!returningActivity,
    returningKeyword: returningActivity ? 
      returningKeywords.find(k => returningActivity.StatusText.toLowerCase().includes(k)) : null
  };
  
  if (enRouteActivity) {
    log(`  ✓ En Route status found (StatusId 5): ${enRouteActivity.Timestamp}`);
  } else {
    log(`  ⚠️ No En Route status (StatusId 5) found`);
  }
  
  if (onSceneActivity) {
    log(`  ✓ On Scene status found (StatusId 6): ${onSceneActivity.Timestamp}`);
  } else {
    log(`  ⚠️ No On Scene status (StatusId 6) found`);
  }
  
  if (returningActivity) {
    const keyword = returningKeywords.find(k => returningActivity.StatusText.toLowerCase().includes(k));
    log(`  ✓ Returning status found with keyword "${keyword}": ${returningActivity.Timestamp}`);
    log(`    Full status text: "${returningActivity.StatusText}", StatusId: ${returningActivity.StatusId}`);
  } else if (availableActivity) {
    log(`  ✓ Available status found (StatusId 2): ${availableActivity.Timestamp}`);
  } else {
    log(`  ⚠️ No Returning or Available status found`);
  }
  
  return statusSummary;
}

/**
 * Process a single call from start to finish
 */
async function processCall(token, call) {
  const callId = call.CallId;
  
  try {
    log(`\n==== Processing call ${callId}: ${call.Name} ====`);
    
    // Fetch detailed call data
    const callData = await fetchCallData(token, callId);
    if (!callData) {
      log(`Skipping call ${callId} due to missing data`);
      return null;
    }
    
    // Fetch extra call data
    const extraData = await fetchCallExtraData(token, callId);
    if (!extraData) {
      log(`Skipping call ${callId} due to missing extra data`);
      return null;
    }
    
    // Save the raw data for reference
    fs.writeFileSync(
      path.join(LOG_DIR, `call_${callId}_data.json`),
      JSON.stringify(callData, null, 2)
    );
    
    fs.writeFileSync(
      path.join(LOG_DIR, `call_${callId}_extra_data.json`),
      JSON.stringify(extraData, null, 2)
    );
    
    // Analyze unit statuses
    const statusAnalysis = analyzeUnitStatuses(callData, extraData);
    
    // Compare XML generators
    const xmlComparison = compareXmlGenerators(callData, extraData, callId);
    
    // Verify the XML fields
    const xmlVerification = verifyXmlFields(xmlComparison.standardXml, callData);
    
    return {
      callId,
      callName: call.Name,
      statusAnalysis,
      xmlComparison,
      xmlVerification
    };
  } catch (error) {
    log(`Error processing call ${callId}: ${error.message}`, true);
    return null;
  }
}

/**
 * Main test function
 */
async function main() {
  ensureLogsDirectory();
  
  try {
    log('Starting full validation test...');
    
    // Get API token
    const token = await getApiToken();
    
    // Get active calls
    const activeCalls = await fetchActiveCalls(token);
    
    // Get recent calls if needed
    let calls = activeCalls;
    if (activeCalls.length < 3) { // If fewer than 3 active calls, also get recent calls
      const recentCalls = await fetchRecentCalls(token);
      // Combine and deduplicate
      const allCallIds = new Set(activeCalls.map(c => c.CallId));
      const additionalCalls = recentCalls.filter(c => !allCallIds.has(c.CallId));
      calls = [...activeCalls, ...additionalCalls];
    }
    
    // Limit to a reasonable number
    calls = calls.slice(0, 5);
    log(`Processing ${calls.length} calls for validation...`);
    
    // Process each call
    const results = [];
    for (const call of calls) {
      const result = await processCall(token, call);
      if (result) {
        results.push(result);
      }
    }
    
    // Summarize results
    log('\n==== VALIDATION SUMMARY ====');
    log(`Processed ${results.length} calls successfully`);
    
    // Check for calls with returning status
    const callsWithReturning = results.filter(r => r.statusAnalysis?.hasReturningStatus);
    log(`Found ${callsWithReturning.length} calls with returning status`);
    
    if (callsWithReturning.length > 0) {
      log('\nCalls with returning status:');
      callsWithReturning.forEach(call => {
        log(`  Call ${call.callId}: ${call.callName}`);
        log(`    Returning time: ${call.statusAnalysis.returning}`);
        log(`    Returning keyword: "${call.statusAnalysis.returningKeyword}"`);
      });
    }
    
    // XML generator comparison summary
    const xmlMatchingCalls = results.filter(r => r.xmlComparison?.allFieldsMatch);
    log(`\n${xmlMatchingCalls.length} of ${results.length} calls have matching XML from both generators`);
    
    // Field verification summary
    const verifiedCalls = results.filter(r => r.xmlVerification);
    log(`${verifiedCalls.length} of ${results.length} calls have all required XML fields verified`);
    
    // Save the most recent call's XML for display
    if (results.length > 0) {
      const mostRecent = results[0];
      fs.writeFileSync(
        path.join(LOG_DIR, 'most_recent_call.xml'),
        mostRecent.xmlComparison.standardXml
      );
      log(`\nMost recent call XML saved to logs/most_recent_call.xml`);
    }
    
    log('\nValidation test completed');
    
    // Return the results for further analysis if needed
    return results;
  } catch (error) {
    log(`Error in validation test: ${error.message}`, true);
    throw error;
  }
}

// Run the main function
main().catch(error => {
  console.error(error);
  process.exit(1);
});