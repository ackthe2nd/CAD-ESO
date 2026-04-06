/**
 * Analyze Call Closure Data for Call 201192
 * 
 * This script examines the closure data captured when the call was closed
 * and verifies the XML generation includes proper closure information.
 */

require('dotenv').config();
const axios = require('axios');
const logger = require('./src/fix-logger');

async function getResgridToken() {
  try {
    const { getApiToken } = require('./src/token-manager');
    return await getApiToken();
  } catch (error) {
    logger.error(`Failed to get API token: ${error.message}`);
    throw error;
  }
}

async function analyzeCallClosureData() {
  try {
    const token = await getResgridToken();
    logger.info('Successfully obtained API token');

    // Fetch the call data to see current state
    const callResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCall`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { callId: 201192 }
    });

    const callData = callResponse.data.Data;
    logger.info(`Call 201192 current state: ${callData.State}`);
    logger.info(`Call 201192 name: ${callData.Name}`);
    
    // Fetch extra data for detailed closure information
    const extraResponse = await axios.get(`https://api.resgrid.com/api/v4/Calls/GetCallExtraData`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { callId: 201192 }
    });

    const extraData = extraResponse.data;
    
    // Analyze call state and closure indicators
    console.log('\n=== CALL CLOSURE ANALYSIS ===');
    console.log(`Call ID: 201192`);
    console.log(`Call State: ${callData.State} (1 = Closed)`);
    console.log(`Call Name: ${callData.Name}`);
    console.log(`Logged On: ${callData.LoggedOn}`);
    console.log(`Logged On UTC: ${callData.LoggedOnUtc}`);
    
    // Check for closure timestamps in various locations
    console.log('\n=== CLOSURE TIMESTAMP ANALYSIS ===');
    
    // Check call-level closure fields
    if (callData.ClosedOn) {
      console.log(`Call ClosedOn: ${callData.ClosedOn}`);
    }
    if (callData.ClosedOnUtc) {
      console.log(`Call ClosedOnUtc: ${callData.ClosedOnUtc}`);
    }
    
    // Check for closure in activities
    if (extraData.Data && extraData.Data.Activity) {
      console.log(`\nActivity entries: ${extraData.Data.Activity.length}`);
      
      extraData.Data.Activity.forEach((activity, index) => {
        console.log(`Activity ${index + 1}:`);
        console.log(`  Type: ${activity.Type}`);
        console.log(`  Timestamp: ${activity.Timestamp}`);
        console.log(`  Action: ${activity.Action || 'N/A'}`);
        console.log(`  Note: ${activity.Note || 'N/A'}`);
        
        // Look for closure-related activities
        if (activity.Type === 'CallClosed' || activity.Action === 'Closed' || 
            (activity.Note && activity.Note.toLowerCase().includes('closed'))) {
          console.log(`  *** CLOSURE ACTIVITY FOUND ***`);
        }
      });
    }
    
    // Check unit activities for closure data
    if (extraData.Data && extraData.Data.Dispatches) {
      console.log(`\n=== UNIT CLOSURE ANALYSIS ===`);
      console.log(`Unit dispatches: ${extraData.Data.Dispatches.length}`);
      
      extraData.Data.Dispatches.forEach((unit, index) => {
        console.log(`\nUnit ${index + 1}: ${unit.Name}`);
        
        // Check if unit has closure-related timestamps
        const unitActivities = extraData.Data.Activity.filter(a => 
          a.UnitId === unit.UnitId || a.UserId === unit.UserId
        );
        
        console.log(`  Unit activities: ${unitActivities.length}`);
        unitActivities.forEach(activity => {
          console.log(`    ${activity.Type} - ${activity.Timestamp}`);
          if (activity.Action) console.log(`      Action: ${activity.Action}`);
        });
      });
    }
    
    // Test XML generation to see closure data
    console.log('\n=== XML GENERATION TEST ===');
    const { generateXML } = require('./src/xml-generator');
    
    const xmlResult = await generateXML(callData, extraData, true);
    const xmlData = typeof xmlResult === 'object' ? xmlResult.xml : xmlResult;
    
    console.log(`Generated XML length: ${xmlData.length} characters`);
    
    // Look for closure-related XML elements
    if (xmlData.includes('<UnitCleared>') && xmlData.includes('</UnitCleared>')) {
      const clearedMatches = xmlData.match(/<UnitCleared>(.*?)<\/UnitCleared>/g);
      console.log(`UnitCleared entries found: ${clearedMatches ? clearedMatches.length : 0}`);
      if (clearedMatches) {
        clearedMatches.forEach((match, index) => {
          const time = match.replace(/<\/?UnitCleared>/g, '');
          if (time && time.trim()) {
            console.log(`  Unit ${index + 1} cleared at: ${time}`);
          }
        });
      }
    }
    
    if (xmlData.includes('<UnitBackInService>') && xmlData.includes('</UnitBackInService>')) {
      const backInServiceMatches = xmlData.match(/<UnitBackInService>(.*?)<\/UnitBackInService>/g);
      console.log(`UnitBackInService entries found: ${backInServiceMatches ? backInServiceMatches.length : 0}`);
      if (backInServiceMatches) {
        backInServiceMatches.forEach((match, index) => {
          const time = match.replace(/<\/?UnitBackInService>/g, '');
          if (time && time.trim()) {
            console.log(`  Unit ${index + 1} back in service at: ${time}`);
          }
        });
      }
    }
    
    // Save detailed analysis
    const analysisData = {
      callData,
      extraData: {
        activityCount: extraData.Data?.Activity?.length || 0,
        dispatchCount: extraData.Data?.Dispatches?.length || 0,
        activities: extraData.Data?.Activity || [],
        dispatches: extraData.Data?.Dispatches || []
      },
      xmlLength: xmlData.length,
      timestamp: new Date().toISOString()
    };
    
    require('fs').writeFileSync('call-closure-analysis.json', JSON.stringify(analysisData, null, 2));
    console.log('\n=== ANALYSIS COMPLETE ===');
    console.log('Detailed data saved to call-closure-analysis.json');

  } catch (error) {
    logger.error(`Analysis failed: ${error.message}`);
    throw error;
  }
}

analyzeCallClosureData()
  .then(() => console.log('Call closure analysis completed successfully'))
  .catch(error => console.error('Analysis failed:', error.message));