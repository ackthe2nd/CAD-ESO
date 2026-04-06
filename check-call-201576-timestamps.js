/**
 * Check Call 201576 for Available Timestamps
 * Analyze what timestamp data is available in Resgrid for this call
 */

require('dotenv').config();
const axios = require('axios');

async function getResgridToken() {
  try {
    const response = await axios.post('https://api.resgrid.com/api/v3/Auth/Validate', {
      Usr: process.env.RESGRID_USER,
      Pass: process.env.RESGRID_PASS
    });
    return response.data;
  } catch (error) {
    console.error('Error getting token:', error.response?.data || error.message);
    throw error;
  }
}

async function fetchCallData(token, callId) {
  try {
    const response = await axios.get(`https://api.resgrid.com/api/v3/Calls/GetCallExtraData?callId=${callId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching call data:', error.response?.data || error.message);
    return null;
  }
}

function analyzeTimestampData(data) {
  console.log('CALL 201576 TIMESTAMP ANALYSIS');
  console.log('='.repeat(50));
  
  if (!data || !data.Data) {
    console.log('No call data available');
    return;
  }
  
  const callData = data.Data;
  
  console.log('\nBASIC CALL TIMES:');
  console.log(`LoggedOn: ${callData.LoggedOn || 'Not found'}`);
  console.log(`LoggedOnUtc: ${callData.LoggedOnUtc || 'Not found'}`);
  console.log(`DispatchedOn: ${callData.DispatchedOn || 'Not found'}`);
  console.log(`DispatchedOnUtc: ${callData.DispatchedOnUtc || 'Not found'}`);
  
  console.log('\nUNIT DISPATCHES:');
  if (callData.Dispatches && callData.Dispatches.length > 0) {
    callData.Dispatches.forEach((dispatch, index) => {
      console.log(`Dispatch ${index + 1}:`);
      console.log(`  Unit: ${dispatch.Unit || 'Unknown'}`);
      console.log(`  Dispatched: ${dispatch.DispatchedOn || 'Not found'}`);
      console.log(`  DispatchedUtc: ${dispatch.DispatchedOnUtc || 'Not found'}`);
    });
  } else {
    console.log('No dispatch data found');
  }
  
  console.log('\nUNIT ACTIVITIES:');
  if (callData.Activity && callData.Activity.length > 0) {
    callData.Activity.forEach((activity, index) => {
      console.log(`Activity ${index + 1}:`);
      console.log(`  Unit: ${activity.Unit || 'Unknown'}`);
      console.log(`  Type: ${activity.Type || 'Unknown'}`);
      console.log(`  Timestamp: ${activity.Timestamp || 'Not found'}`);
      console.log(`  DestinationType: ${activity.DestinationType || 'N/A'}`);
    });
  } else {
    console.log('No activity data found');
  }
  
  console.log('\nCALL STATUS:');
  console.log(`State: ${callData.State || 'Unknown'}`);
  console.log(`Priority: ${callData.Priority || 'Unknown'}`);
  console.log(`Type: ${callData.Type || 'Unknown'}`);
  
  console.log('\nRECOMMENDATIONS:');
  
  if (!callData.Activity || callData.Activity.length === 0) {
    console.log('❌ No unit activities found - call may not have unit status updates');
    console.log('   - Units need to update status (En Route, Arrived, etc.) in Resgrid');
    console.log('   - XML will remain empty until units report actual times');
  }
  
  if (callData.State !== 2) { // Assuming 2 = closed
    console.log('❌ Call still active - ESO needs closed calls with completion times');
    console.log('   - Call must be closed in Resgrid to generate final XML');
    console.log('   - Units need to clear and go back in service');
  }
  
  console.log('\nFor ESO processing, this call needs:');
  console.log('1. Unit status updates (En Route, Arrived, At Patient)');
  console.log('2. Call closure with Unit Cleared times');
  console.log('3. Back in Service status for units');
}

async function main() {
  try {
    const token = await getResgridToken();
    const callData = await fetchCallData(token, '201576');
    analyzeTimestampData(callData);
  } catch (error) {
    console.error('Analysis failed:', error.message);
  }
}

main();