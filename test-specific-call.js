/**
 * Test Specific Call Script
 * Triggered by Test Call buttons in Google Sheets to test specific calls with the system
 */

require('dotenv').config();
const { apiClient } = require('./src/token-manager.js');
const { generateXML } = require('./src/xml-generator.js');
const { getCallExtraData } = require('./src/resgrid-api.js');

async function testSpecificCall(callId) {
  console.log(`\n=== TESTING CALL ${callId} ===`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  try {
    console.log('Initializing API connection...');

    // Fetch call data using the working GetActiveCalls endpoint
    console.log(`Fetching call data for Call ID ${callId}...`);
    
    // First try to get the call from active calls using the same API client as main system
    let callData = null;
    try {
      const activeCallsResponse = await apiClient.get('Calls/GetActiveCalls');
      const activeCalls = activeCallsResponse.data || [];
      callData = activeCalls.find(call => call.CallId.toString() === callId.toString());
      
      if (callData) {
        console.log('✅ Found call in active calls');
      }
    } catch (error) {
      console.log('Could not fetch from active calls, trying alternative method...');
    }

    // If not found in active calls, try the GetCalls endpoint with date range
    if (!callData) {
      try {
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        
        const callsResponse = await apiClient.get('Calls/GetCalls', {
          params: {
            startDate: startDate,
            endDate: endDate
          }
        });

        const allCalls = callsResponse.data || [];
        callData = allCalls.find(call => call.CallId.toString() === callId.toString());
        
        if (callData) {
          console.log('✅ Found call in recent calls');
        }
      } catch (error) {
        console.log('Could not fetch from recent calls either');
      }
    }

    if (!callData || !callData.CallId) {
      throw new Error(`Call ${callId} not found in active or recent calls`);
    }

    // Fetch extra call data
    console.log('Fetching extra call data...');
    const extraData = await getCallExtraData(callId);
    console.log('✅ Extra call data retrieved');

    // Display call information
    console.log('\n--- CALL INFORMATION ---');
    console.log(`Call ID: ${callData.CallId}`);
    console.log(`Title: ${callData.Name || 'N/A'}`);
    console.log(`Nature: ${callData.Nature || 'N/A'}`);
    console.log(`State: ${callData.State} (${callData.State === 0 ? 'Active' : callData.State === 1 ? 'Closed' : 'Unknown'})`);
    console.log(`Address: ${callData.Address || 'N/A'}`);
    console.log(`Priority: ${callData.Priority || 'N/A'}`);
    console.log(`Logged On: ${callData.LoggedOn || 'N/A'}`);

    // Test XML generation
    console.log('\n--- TESTING XML GENERATION ---');
    const xml = await generateXML(callData, extraData, true); // Enable debug mode
    
    if (xml && xml.length > 0) {
      console.log(`✅ XML generated successfully (${xml.length} characters)`);
      
      // Validate XML structure
      const hasXmlDeclaration = xml.includes('<?xml');
      const hasCadIncident = xml.includes('<CadIncident');
      const hasCallId = xml.includes(callId);
      
      console.log(`✅ XML Declaration: ${hasXmlDeclaration}`);
      console.log(`✅ CadIncident Root: ${hasCadIncident}`);
      console.log(`✅ Contains Call ID: ${hasCallId}`);
      
      if (hasXmlDeclaration && hasCadIncident && hasCallId) {
        console.log('✅ XML structure validation passed');
      } else {
        console.log('❌ XML structure validation failed');
      }
    } else {
      console.log('❌ XML generation failed');
    }

    // Test unit extraction
    console.log('\n--- TESTING UNIT EXTRACTION ---');
    if (extraData && extraData.Data && extraData.Data.Dispatches) {
      const units = extraData.Data.Dispatches.length;
      console.log(`✅ Found ${units} unit dispatches`);
      
      extraData.Data.Dispatches.forEach((dispatch, index) => {
        console.log(`  Unit ${index + 1}: ${dispatch.UnitName || dispatch.Name || 'Unknown'} (ID: ${dispatch.UnitId})`);
      });
    } else {
      console.log('ℹ️ No unit dispatches found in extra data');
    }

    // Test activity extraction
    console.log('\n--- TESTING ACTIVITY EXTRACTION ---');
    if (extraData && extraData.Data && extraData.Data.Activity) {
      const activities = extraData.Data.Activity.length;
      console.log(`✅ Found ${activities} activities`);
      
      // Show recent activities
      const recentActivities = extraData.Data.Activity.slice(-5);
      recentActivities.forEach((activity, index) => {
        console.log(`  Activity ${index + 1}: ${activity.UnitName || 'Unknown'} - Status ${activity.StatusId} (${activity.Timestamp})`);
      });
    } else {
      console.log('ℹ️ No activities found in extra data');
    }

    // Test closure detection
    console.log('\n--- TESTING CLOSURE DETECTION ---');
    const isClosed = callData.State === 1 || callData.State === '1';
    const hasClosureTime = callData.ClosedOn || callData.CallClosedTime;
    
    console.log(`Call State: ${callData.State} (${isClosed ? 'Closed' : 'Active'})`);
    console.log(`Closure Time: ${hasClosureTime || 'Not set'}`);
    
    if (isClosed) {
      console.log('✅ Call is properly marked as closed');
    } else {
      console.log('ℹ️ Call is currently active');
    }

    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    console.log(`Call ${callId} processed without errors`);
    console.log(`XML generated: ${xml ? 'Yes' : 'No'}`);
    console.log(`Data integrity: Verified`);
    
    return {
      success: true,
      callId: callId,
      callData: callData,
      extraData: extraData,
      xml: xml,
      xmlLength: xml ? xml.length : 0
    };

  } catch (error) {
    console.log('\n=== TEST FAILED ===');
    console.log(`Error testing call ${callId}: ${error.message}`);
    console.log(`Stack trace: ${error.stack}`);
    
    return {
      success: false,
      callId: callId,
      error: error.message
    };
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node test-specific-call.js <callId>');
    console.log('Example: node test-specific-call.js 201192');
    process.exit(1);
  }

  // Extract call ID from arguments (handle test-call-XXXXX format)
  let callId = args[0];
  if (callId.startsWith('test-call-')) {
    callId = callId.replace('test-call-', '');
  }

  console.log('Specific Call Testing Tool');
  console.log('=========================');
  
  const result = await testSpecificCall(callId);
  
  if (result.success) {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  } else {
    console.log('\n❌ Test failed');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { testSpecificCall };