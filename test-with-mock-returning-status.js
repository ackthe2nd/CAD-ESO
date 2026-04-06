/**
 * Test "returning" status detection with mock data
 * This script creates a modified version of call data with returning status added
 */
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`${timestamp} [${prefix}]: ${message}`);
}

/**
 * Gets real call data and adds mock returning status
 */
async function getCallDataWithReturningStatus() {
  try {
    log('Getting real call data...');
    
    // Get token
    const username = process.env.RESGRID_USER;
    const password = process.env.RESGRID_PASS;
    
    if (!username || !password) {
      throw new Error('Missing Resgrid credentials in environment variables');
    }
    
    // Get token
    const tokenResponse = await axios.post('https://api.resgrid.com/api/v4/Connect/token', 
      `grant_type=password&username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    const token = tokenResponse.data.access_token;
    
    // Get call data for an existing call
    const callId = '198513'; // Use the call ID you want to test with 
    
    // Get call data
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    // Get extra data
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${callId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });
    
    const callData = callResponse.data.Data;
    const extraData = extraResponse.data.Data;
    
    log('Successfully obtained call data');
    
    // Make a copy of the data to modify
    const modifiedCallData = { ...callData };
    const modifiedExtraData = JSON.parse(JSON.stringify(extraData)); // Deep copy
    
    // Add returning status to the activities
    if (modifiedExtraData.Activity && Array.isArray(modifiedExtraData.Activity)) {
      log('Adding mock returning status to activities...');
      
      // Find the unit name from the existing activities
      let unitName = '';
      const unitActivity = modifiedExtraData.Activity.find(a => a.Type === 'Unit' && a.Name);
      if (unitActivity) {
        unitName = unitActivity.Name;
      } else if (modifiedExtraData.Dispatches && modifiedExtraData.Dispatches.length > 0) {
        const unitDispatch = modifiedExtraData.Dispatches.find(d => d.Type === 'Unit' && d.Name);
        if (unitDispatch) {
          unitName = unitDispatch.Name;
        }
      }
      
      if (!unitName) {
        throw new Error('Could not find a unit name in the call data');
      }
      
      // Create a new activity with "returning" status
      const currentTime = new Date();
      const returningActivity = {
        Id: "99999", // Mock ID
        Timestamp: currentTime.toISOString(),
        Type: "Unit",
        Name: unitName,
        GroupId: null,
        Group: null,
        Note: "",
        StatusId: 7, // Different ID to test detection by text, not ID
        Location: "", 
        StatusText: "Returning to Station",
        StatusColor: "#00ff00"
      };
      
      // Add to activities
      modifiedExtraData.Activity.push(returningActivity);
      
      // Sort activities by timestamp
      modifiedExtraData.Activity.sort((a, b) => {
        const dateA = new Date(a.Timestamp);
        const dateB = new Date(b.Timestamp);
        return dateA - dateB;
      });
      
      log(`Added returning status activity for unit ${unitName} at ${returningActivity.Timestamp}`);
    }
    
    return {
      callData: modifiedCallData,
      extraData: modifiedExtraData
    };
    
  } catch (error) {
    log(`Error getting call data: ${error.message}`, true);
    throw error;
  }
}

/**
 * Test returning status detection with modified data
 */
async function testReturningStatusDetection() {
  log('Starting test with mock returning status...');
  
  try {
    // Get modified call data
    const { callData, extraData } = await getCallDataWithReturningStatus();
    
    // Import our XML generator
    const { generateXML } = require('./src/xml-generator');
    
    // Generate XML 
    log('Generating XML with modified data...');
    const xml = generateXML(callData, extraData, true);
    
    // Check the result
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Save the XML to a file
    const xmlPath = path.join(logsDir, 'mock_returning_status_test.xml');
    fs.writeFileSync(xmlPath, xml);
    log(`XML saved to ${xmlPath}`);
    
    // Check if UnitBackInService field is populated
    const backInServiceMatch = xml.match(/<UnitBackInService>(.*?)<\/UnitBackInService>/);
    if (backInServiceMatch && backInServiceMatch[1]) {
      log(`✓ UnitBackInService populated with: ${backInServiceMatch[1]}`);
    } else {
      log('✗ UnitBackInService field is empty', true);
    }
    
    // Also check if other fields are present as expected
    log('\nVerifying other XML fields:');
    verifyXmlField(xml, 'IncidentNumber', callData.CallId);
    verifyXmlField(xml, 'IncidentOrOnset', callData.LoggedOn);
    verifyXmlField(xml, 'UnitEnRoute', extraData.Activity.find(a => a.StatusId === 5)?.Timestamp);
    verifyXmlField(xml, 'UnitArrivedOnScene', extraData.Activity.find(a => a.StatusId === 6)?.Timestamp);
    
    // Save the modified data to files for reference
    fs.writeFileSync(
      path.join(logsDir, 'mock_returning_call_data.json'),
      JSON.stringify(callData, null, 2)
    );
    
    fs.writeFileSync(
      path.join(logsDir, 'mock_returning_extra_data.json'),
      JSON.stringify(extraData, null, 2)
    );
    
    log('Test with mock returning status completed');
  } catch (error) {
    log(`Error during test: ${error.message}`, true);
  }
}

/**
 * Helper function to verify XML fields
 */
function verifyXmlField(xml, fieldName, expectedValue) {
  if (!expectedValue) {
    log(`  • ${fieldName}: No expected value provided`);
    return;
  }
  
  const regex = new RegExp(`<${fieldName}>(.*?)</${fieldName}>`);
  const match = xml.match(regex);
  
  if (match && match[1] === expectedValue) {
    log(`  ✓ ${fieldName}: Correctly populated with "${expectedValue}"`);
  } else if (match) {
    log(`  ⚠️ ${fieldName}: Value "${match[1]}" does not match expected "${expectedValue}"`);
  } else {
    log(`  ✗ ${fieldName}: Field not found or empty`, true);
  }
}

// Run the test
testReturningStatusDetection().catch(error => {
  console.error('Unhandled error:', error);
});