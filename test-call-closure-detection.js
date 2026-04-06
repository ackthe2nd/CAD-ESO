/**
 * Test Call Closure Detection
 * 
 * This script tests the enhanced call closure detection logic that looks for
 * unit activities indicating call closure (Status IDs 8, 2, 9).
 */

require('dotenv').config();

async function getResgridToken() {
  const axios = require('axios');
  
  const response = await axios.post('https://api.resgrid.com/api/v4/Security/Token', {
    Username: process.env.RESGRID_USER,
    Password: process.env.RESGRID_PASS
  }, {
    headers: {
      'Content-Type': 'application/json'
    }
  });
  
  return response.data.Tkn;
}

async function testCallClosureDetection() {
  console.log('Testing Call Closure Detection Logic');
  console.log('=====================================');
  
  try {
    const token = await getResgridToken();
    if (!token) {
      console.error('Failed to get Resgrid API token');
      return;
    }
    
    // Test with call 201192 which should have closure activities
    const testCallId = '201192';
    console.log(`\nTesting with Call ID: ${testCallId}`);
    
    // Fetch call data
    const callResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetCall?callId=${testCallId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!callResponse.ok) {
      throw new Error(`Failed to fetch call data: ${callResponse.status}`);
    }
    
    const callData = await callResponse.json();
    console.log('✓ Successfully fetched call data');
    
    // Fetch extra data 
    const extraResponse = await fetch(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData?callId=${testCallId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!extraResponse.ok) {
      throw new Error(`Failed to fetch extra data: ${extraResponse.status}`);
    }
    
    const extraData = await extraResponse.json();
    console.log('✓ Successfully fetched extra data');
    
    // Test the closure detection logic
    const callGetData = callData.Data;
    const extraGetData = extraData.Data;
    
    console.log('\nCall Information:');
    console.log(`- Call ID: ${callGetData.CallId}`);
    console.log(`- State: ${callGetData.State}`);
    console.log(`- ClosedOn: ${callGetData.ClosedOn || 'Not set'}`);
    console.log(`- DispatchClosedTime: ${callGetData.DispatchClosedTime || 'Not set'}`);
    
    // Check unit activities for closure indicators
    const unitActivityData = extraGetData.Activity || [];
    console.log(`\nUnit Activities Found: ${unitActivityData.length}`);
    
    if (unitActivityData.length > 0) {
      const closureStatusIds = [8, 2, 9]; // Cleared, Available, Returning
      
      console.log('\nChecking for closure activities...');
      const closureActivities = unitActivityData
        .filter(activity => 
          activity.Type === 'Unit' && 
          activity.StatusId && 
          closureStatusIds.includes(activity.StatusId) &&
          activity.Timestamp &&
          !activity.Timestamp.startsWith('0001-01-01')
        )
        .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp));
      
      console.log(`Found ${closureActivities.length} closure activities:`);
      
      closureActivities.forEach((activity, index) => {
        console.log(`  ${index + 1}. ${activity.UnitName || activity.Name} - Status ${activity.StatusId} at ${activity.Timestamp}`);
        console.log(`     Status Text: ${activity.DestinationStateText || 'N/A'}`);
      });
      
      if (closureActivities.length > 0) {
        const latestClosure = closureActivities[0];
        console.log(`\n✓ Latest closure activity: ${latestClosure.UnitName || latestClosure.Name} at ${latestClosure.Timestamp}`);
        console.log(`✓ Call should be marked as closed with time: ${latestClosure.Timestamp}`);
      } else {
        console.log('\n⚠ No closure activities found');
      }
    }
    
    // Test all unit activities to understand the flow
    console.log('\nAll Unit Activities:');
    unitActivityData
      .filter(activity => activity.Type === 'Unit')
      .sort((a, b) => new Date(a.Timestamp) - new Date(b.Timestamp))
      .forEach(activity => {
        console.log(`- ${activity.UnitName || activity.Name}: Status ${activity.StatusId} (${activity.DestinationStateText}) at ${activity.Timestamp}`);
      });
    
  } catch (error) {
    console.error('Error testing call closure detection:', error.message);
  }
}

// Run the test
testCallClosureDetection();