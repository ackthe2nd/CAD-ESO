/**
 * Analyze an active call for unit information
 * 
 * This script fetches the details of active calls and analyzes the unit information
 * to help debug why units are not appearing in the XML output.
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
// Helper function to strip HTML tags
function stripHtmlTags(text) {
  if (!text) return '';
  return text.replace(/<[^>]*>?/gm, '');
}

// Constants
const API_BASE_URL = 'https://api.resgrid.com/api/v4';

async function getApiToken() {
  const tokenUrl = `${API_BASE_URL}/Connect/token`;
  const params = new URLSearchParams();
  params.append('grant_type', 'password');
  params.append('username', process.env.RESGRID_USER);
  params.append('password', process.env.RESGRID_PASS);

  try {
    const response = await axios.post(tokenUrl, params);
    return response.data.access_token;
  } catch (error) {
    console.error('Failed to get API token:', error.message);
    if (error.response) {
      console.error('Status code:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data));
    }
    throw error;
  }
}

async function fetchActiveCalls(token) {
  try {
    const response = await axios.get(`${API_BASE_URL}/Calls/GetActiveCalls`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    // The API sometimes returns an object with a Data property instead of a direct array
    if (response.data && response.data.Data && Array.isArray(response.data.Data)) {
      console.log(`Found ${response.data.Data.length} active calls (in Data property)`);
      return response.data.Data;
    } else if (Array.isArray(response.data)) {
      console.log(`Found ${response.data.length} active calls (direct array)`);
      return response.data;
    } else {
      console.log('Unexpected response format from GetActiveCalls:', typeof response.data);
      console.log('Response structure:', JSON.stringify(response.data).substring(0, 200) + '...');
      return [];
    }
  } catch (error) {
    console.error('Failed to fetch active calls:', error.message);
    return [];
  }
}

async function fetchCallDetails(token, callId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/Calls/GetCall?callId=${callId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch details for call ${callId}:`, error.message);
    return null;
  }
}

async function fetchCallExtraData(token, callId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    return response.data;
  } catch (error) {
    console.error(`Failed to fetch extra data for call ${callId}:`, error.message);
    return null;
  }
}

function saveDataToFile(data, filename) {
  const logDir = './logs';
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  fs.writeFileSync(`${logDir}/${filename}`, JSON.stringify(data, null, 2));
  console.log(`Saved data to ${logDir}/${filename}`);
}

async function analyzeCallUnitInfo(token, call) {
  const callId = call.CallId;
  const callName = call.Name;
  
  console.log(`\nAnalyzing call ${callId}: ${callName}`);
  
  // Check for UnitsCsv in call data
  console.log(`UnitsCsv from GetActiveCalls: ${call.UnitsCsv || 'Not found'}`);
  
  // Check for Dispatches in call data
  if (call.Dispatches && Array.isArray(call.Dispatches)) {
    console.log(`Dispatches from GetActiveCalls: ${call.Dispatches.length} entries`);
    call.Dispatches.forEach(d => {
      console.log(`  - ${d.Type}: ${d.Name} (${d.Id})`);
    });
  } else {
    console.log('Dispatches from GetActiveCalls: Not found or not an array');
  }
  
  // Fetch detailed call data
  const callDetails = await fetchCallDetails(token, callId);
  if (callDetails) {
    console.log('\nDetailed call data:');
    console.log(`UnitsCsv from GetCall: ${callDetails.Data?.UnitsCsv || 'Not found'}`);
    
    // Save detailed call data to file
    saveDataToFile(callDetails, `call_${callId}_details.json`);
  }
  
  // Fetch extra call data
  const extraData = await fetchCallExtraData(token, callId);
  if (extraData) {
    console.log('\nExtra call data:');
    
    // Check for Dispatches in extra data
    if (extraData.Data?.Dispatches && Array.isArray(extraData.Data.Dispatches)) {
      console.log(`Dispatches from GetCallExtraData: ${extraData.Data.Dispatches.length} entries`);
      extraData.Data.Dispatches.forEach(d => {
        console.log(`  - ${d.Type}: ${d.Name || 'No name'} (${d.Id || 'No ID'})`);
      });
    } else {
      console.log('Dispatches from GetCallExtraData: Not found or not an array');
    }
    
    // Check for Units in extra data
    if (extraData.Data?.Units && Array.isArray(extraData.Data.Units)) {
      console.log(`Units from GetCallExtraData: ${extraData.Data.Units.length} entries`);
      extraData.Data.Units.forEach(u => {
        console.log(`  - ${u.Name || 'No name'} (${u.UnitId || 'No ID'}): ${u.Status || 'No status'}`);
      });
    } else {
      console.log('Units from GetCallExtraData: Not found or not an array');
    }
    
    // Check for Activity in extra data
    if (extraData.Data?.Activity && Array.isArray(extraData.Data.Activity)) {
      console.log(`Activity from GetCallExtraData: ${extraData.Data.Activity.length} entries`);
      extraData.Data.Activity.slice(0, 5).forEach(a => {
        console.log(`  - ${a.Type || 'No type'}: ${a.Name || 'No name'}, Status: ${a.StatusText || 'No status'} (${a.StatusId || 'No ID'})`);
      });
      if (extraData.Data.Activity.length > 5) {
        console.log(`    ... and ${extraData.Data.Activity.length - 5} more activities`);
      }
    } else {
      console.log('Activity from GetCallExtraData: Not found or not an array');
    }
    
    // Save extra call data to file
    saveDataToFile(extraData, `call_${callId}_extra.json`);
  }
  
  console.log('\n---------------------------------------------------\n');
}

async function main() {
  try {
    const token = await getApiToken();
    const activeCalls = await fetchActiveCalls(token);
    
    if (activeCalls.length === 0) {
      console.log('No active calls found to analyze.');
      return;
    }
    
    for (const call of activeCalls) {
      await analyzeCallUnitInfo(token, call);
    }
    
    console.log('Call unit information analysis complete.');
  } catch (error) {
    console.error('Error in main function:', error.message);
  }
}

main();