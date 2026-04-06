/**
 * Check Known Calls for Closure Data
 * 
 * Uses the Google Sheets data to get known call IDs and checks
 * each one for closure information using working API endpoints.
 */

require('dotenv').config();
const { google } = require('googleapis');
const { apiClient } = require('./src/token-manager');

async function getResgridToken() {
  const { getApiToken } = require('./src/token-manager');
  return await getApiToken();
}

async function getKnownCallIds() {
  // Get Google Sheets auth
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON),
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // Read call data from Google Sheets
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.LOG_SHEET_ID,
    range: 'Call Data!A:AC', // Expanded range to include all columns
  });
  
  const rows = response.data.values || [];
  if (rows.length <= 1) return [];
  
  const headers = rows[0];
  const callIdIndex = headers.indexOf('Emergency Call ID');
  const callClosedTimeIndex = headers.indexOf('Call Closed Time');
  const callClosedIndex = headers.indexOf('Call Closed');
  
  console.log(`Found headers: ${headers.join(', ')}`);
  console.log(`Call ID index: ${callIdIndex}, Call Closed Time index: ${callClosedTimeIndex}, Call Closed index: ${callClosedIndex}`);
  
  const calls = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const callId = row[callIdIndex];
    const callClosedTime = row[callClosedTimeIndex] || '';
    const callClosed = row[callClosedIndex] || '';
    
    if (callId) {
      calls.push({
        callId,
        callClosedTime,
        callClosed,
        hasClosureData: callClosedTime !== '' || callClosed === 'Yes'
      });
    }
  }
  
  return calls;
}

async function checkKnownCallsClosureData() {
  console.log('Checking Known Calls for Closure Data');
  console.log('====================================');
  
  try {
    // Get known calls from Google Sheets
    const knownCalls = await getKnownCallIds();
    console.log(`Found ${knownCalls.length} calls in Google Sheets`);
    
    // Filter to calls that have closure data
    const closedCalls = knownCalls.filter(call => call.hasClosureData);
    console.log(`Found ${closedCalls.length} calls with closure data`);
    
    // Also include some calls without closure data for comparison
    const openCalls = knownCalls.filter(call => !call.hasClosureData).slice(0, 3);
    console.log(`Including ${openCalls.length} calls without closure data for comparison`);
    
    const callsToCheck = [...closedCalls.slice(0, 5), ...openCalls];
    
    console.log('\nCalls to examine:');
    callsToCheck.forEach(call => {
      console.log(`  ${call.callId}: Closed=${call.callClosed}, ClosedTime=${call.callClosedTime}`);
    });
    
    // Check each call using the working API endpoints
    for (const call of callsToCheck) {
      console.log(`\n=== Examining Call ${call.callId} ===`);
      console.log(`Google Sheets data: Closed=${call.callClosed}, ClosedTime=${call.callClosedTime}`);
      
      try {
        // Get basic call data
        const callResponse = await apiClient.get('Calls/GetCall', {
          params: { callId: call.callId }
        });
        
        const callData = callResponse.data.Data;
        console.log(`State: ${callData.State}`);
        console.log(`LoggedOn: ${callData.LoggedOn}`);
        
        // Look for any closure-related fields
        const closureFields = [];
        Object.keys(callData).forEach(key => {
          const value = callData[key];
          const lowerKey = key.toLowerCase();
          if (value && value !== '' && value !== '0001-01-01T00:00:00' &&
              (lowerKey.includes('close') || lowerKey.includes('end') || 
               lowerKey.includes('complete') || lowerKey.includes('finish'))) {
            closureFields.push(`${key}: ${value}`);
          }
        });
        
        if (closureFields.length > 0) {
          console.log(`Closure-related fields: ${closureFields.join(', ')}`);
        } else {
          console.log('No closure-related fields found');
        }
        
        // Get extra data to check activities
        try {
          const extraResponse = await apiClient.get('Calls/GetCallExtraData', {
            params: { callId: call.callId }
          });
          
          const extraData = extraResponse.data.Data;
          const activities = extraData.Activity || [];
          
          console.log(`Found ${activities.length} activities`);
          
          // Look for closure activities (Status IDs 8, 2, 9)
          const closureActivities = activities.filter(activity => 
            [8, 2, 9].includes(activity.StatusId)
          );
          
          if (closureActivities.length > 0) {
            console.log(`Found ${closureActivities.length} closure activities:`);
            closureActivities.forEach(activity => {
              console.log(`  ${activity.Name}: Status ${activity.StatusId} (${activity.StatusText}) at ${activity.Timestamp}`);
            });
            
            // Find latest closure activity
            const latestClosure = closureActivities.reduce((latest, current) => {
              return new Date(current.Timestamp) > new Date(latest.Timestamp) ? current : latest;
            });
            
            console.log(`Latest closure activity: ${latestClosure.Name} at ${latestClosure.Timestamp}`);
          } else {
            console.log('No closure activities found');
          }
          
        } catch (extraError) {
          console.log(`Failed to get extra data: ${extraError.message}`);
        }
        
      } catch (callError) {
        console.log(`Failed to get call data: ${callError.message}`);
      }
    }
    
    console.log('\n====================================');
    console.log('Summary of Findings:');
    console.log('====================================');
    console.log('This analysis should help identify:');
    console.log('1. What State values represent closed calls');
    console.log('2. Whether closure time comes from call data or unit activities');
    console.log('3. How Google Sheets closure data was originally populated');
    
  } catch (error) {
    console.error('Error checking known calls:', error.message);
  }
}

// Run the check
checkKnownCallsClosureData();