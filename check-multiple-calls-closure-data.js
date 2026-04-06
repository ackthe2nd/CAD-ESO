/**
 * Check Multiple Previous Calls for Closure Data
 * 
 * This script fetches multiple previous calls to check if any have
 * call closed time data in the raw Resgrid API response.
 */

require('dotenv').config();
const { apiClient } = require('./src/token-manager');

async function getResgridToken() {
  const { getApiToken } = require('./src/token-manager');
  return await getApiToken();
}

async function checkMultipleCallsClosureData() {
  console.log('Checking Multiple Previous Calls for Closure Data');
  console.log('=================================================');
  
  try {
    // Test calls we know exist from Google Sheets
    const testCallIds = ['201108', '201105', '201104', '201192', '201103', '201102', '201101', '201100'];
    
    for (const callId of testCallIds) {
      console.log(`\n=== Examining Call ${callId} ===`);
      
      try {
        // Get basic call data first
        const callResponse = await apiClient.get('Calls/GetCall', {
          params: { callId }
        });
        
        const callData = callResponse.data.Data;
        console.log(`State: ${callData.State} (${callData.State === 0 ? 'Active' : 'Closed'})`);
        console.log(`LoggedOn: ${callData.LoggedOn}`);
        
        // Print ALL fields to look for hidden closure fields
        console.log('\nALL CALL FIELDS:');
        Object.keys(callData).sort().forEach(key => {
          const value = callData[key];
          if (value && value !== '' && value !== '0001-01-01T00:00:00' && value !== null) {
            console.log(`  ${key}: ${value}`);
          } else if (key.toLowerCase().includes('close') || key.toLowerCase().includes('end') || 
                     key.toLowerCase().includes('complete') || key.toLowerCase().includes('finish')) {
            console.log(`  ${key}: ${value} (empty but potentially relevant)`);
          }
        });
        
        // Get extra data
        try {
          const extraResponse = await apiClient.get('Calls/GetCallExtraData', {
            params: { callId }
          });
          
          const extraData = extraResponse.data.Data;
          console.log(`\nExtra data top-level keys: ${Object.keys(extraData).join(', ')}`);
          
          // Check if there are any closure-related fields in extra data
          Object.keys(extraData).forEach(key => {
            const value = extraData[key];
            const lowerKey = key.toLowerCase();
            
            if (lowerKey.includes('close') || lowerKey.includes('end') || 
                lowerKey.includes('complete') || lowerKey.includes('finish')) {
              console.log(`  Closure-related extra field ${key}: ${value}`);
            }
          });
          
          // Check activities for closure patterns
          const activities = extraData.Activity || [];
          console.log(`Found ${activities.length} activities`);
          
          if (activities.length > 0) {
            console.log('Activity timestamps and statuses:');
            activities.forEach((activity, index) => {
              console.log(`  ${index + 1}. ${activity.Name}: Status ${activity.StatusId} (${activity.StatusText}) at ${activity.Timestamp}`);
            });
            
            // Look for closure activities
            const closureActivities = activities.filter(activity => 
              [8, 2, 9].includes(activity.StatusId)
            );
            
            if (closureActivities.length > 0) {
              const latestClosure = closureActivities.reduce((latest, current) => {
                return new Date(current.Timestamp) > new Date(latest.Timestamp) ? current : latest;
              });
              console.log(`Latest closure activity: ${latestClosure.Name} at ${latestClosure.Timestamp}`);
            }
          }
          
          // Check dispatches for closure patterns
          const dispatches = extraData.Dispatches || [];
          if (dispatches.length > 0) {
            console.log(`Found ${dispatches.length} dispatch entries`);
            dispatches.forEach((dispatch, index) => {
              console.log(`  Dispatch ${index + 1}: ${dispatch.Name} - Status ${dispatch.StatusId} (${dispatch.StatusText}) at ${dispatch.Timestamp}`);
            });
          }
          
        } catch (extraError) {
          console.log(`Failed to get extra data: ${extraError.message}`);
        }
        
      } catch (callError) {
        console.log(`Call ${callId} not found or error: ${callError.message}`);
      }
    }
    
    // Try to get a broader date range to see more calls
    console.log('\n=== Trying to get calls from date range ===');
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // Last 7 days
      
      const response = await apiClient.get('Calls/GetCallsInDateRange', {
        params: {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0]
        }
      });
      
      const calls = response.data.Data || response.data || [];
      console.log(`Found ${calls.length} calls in date range`);
      
      if (calls.length > 0) {
        // Group by state
        const callsByState = {};
        calls.forEach(call => {
          const state = call.State;
          if (!callsByState[state]) callsByState[state] = [];
          callsByState[state].push(call);
        });
        
        console.log('\nCalls by state:');
        Object.keys(callsByState).forEach(state => {
          console.log(`  State ${state}: ${callsByState[state].length} calls`);
          
          // Show first call of each state with all fields
          const sampleCall = callsByState[state][0];
          console.log(`    Sample call ${sampleCall.CallId} fields:`);
          Object.keys(sampleCall).forEach(key => {
            const value = sampleCall[key];
            if (value && value !== '' && value !== '0001-01-01T00:00:00' && value !== null) {
              console.log(`      ${key}: ${value}`);
            }
          });
        });
      }
    } catch (dateRangeError) {
      console.log(`Date range query failed: ${dateRangeError.message}`);
    }
    
    console.log('\n=================================================');
    console.log('CRITICAL FINDINGS SUMMARY:');
    console.log('=================================================');
    console.log('1. State 0 = Active calls, State 1 = Closed calls');
    console.log('2. Looking for the field that contains the actual closure timestamp');
    console.log('3. Need to identify when State changes from 0 to 1 and what triggers it');
    console.log('4. The closure timestamp should be when dispatcher closes the call, not unit activities');
    
  } catch (error) {
    console.error('Error checking multiple calls:', error.message);
  }
}

// Run the check
checkMultipleCallsClosureData();