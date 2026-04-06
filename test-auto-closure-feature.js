/**
 * Test Auto-Closure Feature
 * Demonstrates how the auto-closure manager works with sample data
 */

const AutoClosureManager = require('./src/auto-closure-manager');
const logger = require('./src/logger');

async function testAutoClosureFeature() {
  console.log('='.repeat(60));
  console.log('AUTO-CLOSURE FEATURE DEMONSTRATION');
  console.log('='.repeat(60));
  
  // Create auto-closure manager with test configuration
  const autoClosureManager = new AutoClosureManager({
    enableAutoClose: true,
    timeoutMinutes: 2, // 2 minutes for testing
    checkIntervalMinutes: 0.5, // Check every 30 seconds for testing
    closureStatuses: [4, 10], // Status 4 = Out of Service (primary), Status 10 = legacy
    requireAllUnitsInactive: true,
    notifyOnClosure: true
  });
  
  console.log('\n1. Starting Auto-Closure Manager...');
  autoClosureManager.start();
  
  // Simulate active calls
  const testCalls = [
    {
      CallId: 'TEST001',
      Title: 'Medical Emergency - Chest Pain',
      Units: [{ UnitId: 8826, Id: 8826 }], // STN1
      DispatchList: [{ UnitId: 8826 }]
    },
    {
      CallId: 'TEST002', 
      Title: 'Vehicle Accident - MVA',
      Units: [
        { UnitId: 8826, Id: 8826 }, // STN1
        { UnitId: 8827, Id: 8827 }  // STN2
      ],
      DispatchList: [
        { UnitId: 8826 },
        { UnitId: 8827 }
      ]
    }
  ];
  
  console.log('\n2. Adding test calls to monitoring...');
  testCalls.forEach(call => {
    autoClosureManager.addCallToMonitoring(call);
    console.log(`   Added call ${call.CallId}: ${call.Title}`);
  });
  
  // Show initial stats
  console.log('\n3. Initial monitoring statistics...');
  const initialStats = autoClosureManager.getMonitoringStats();
  console.log(`   Monitoring enabled: ${initialStats.isRunning}`);
  console.log(`   Calls being monitored: ${initialStats.monitoredCalls}`);
  console.log(`   Timeout period: ${initialStats.config.timeoutMinutes} minutes`);
  console.log(`   Check interval: ${initialStats.config.checkIntervalMinutes} minutes`);
  
  // Display monitored calls
  console.log('\n4. Monitored call details...');
  initialStats.callDetails.forEach(call => {
    console.log(`   Call ${call.callId}: ${call.title}`);
    console.log(`     Units: ${call.unitCount}`);
    console.log(`     Time since activity: ${call.timeSinceActivity.toFixed(1)} minutes`);
    console.log(`     Checks performed: ${call.checkCount}`);
  });
  
  // Simulate unit activity updates
  console.log('\n5. Simulating unit activity updates...');
  setTimeout(() => {
    console.log('   Unit activity detected for TEST001 - resetting timer');
    autoClosureManager.updateCallActivity('TEST001');
  }, 30000); // 30 seconds
  
  setTimeout(() => {
    console.log('   Unit activity detected for TEST002 - resetting timer');
    autoClosureManager.updateCallActivity('TEST002');
  }, 60000); // 1 minute
  
  // Show stats after some time
  setTimeout(() => {
    console.log('\n6. Updated monitoring statistics...');
    const updatedStats = autoClosureManager.getMonitoringStats();
    console.log(`   Calls still monitored: ${updatedStats.monitoredCalls}`);
    
    updatedStats.callDetails.forEach(call => {
      console.log(`   Call ${call.callId}:`);
      console.log(`     Time since activity: ${call.timeSinceActivity.toFixed(1)} minutes`);
      console.log(`     Checks performed: ${call.checkCount}`);
      console.log(`     Status: ${call.timeSinceActivity >= updatedStats.config.timeoutMinutes ? 'ELIGIBLE FOR CLOSURE' : 'Active'}`);
    });
  }, 90000); // 1.5 minutes
  
  // Test manual call removal
  setTimeout(() => {
    console.log('\n7. Manually closing TEST001...');
    autoClosureManager.removeCallFromMonitoring('TEST001');
    console.log('   Call TEST001 removed from monitoring');
    
    const finalStats = autoClosureManager.getMonitoringStats();
    console.log(`   Remaining monitored calls: ${finalStats.monitoredCalls}`);
  }, 120000); // 2 minutes
  
  // Cleanup and stop
  setTimeout(() => {
    console.log('\n8. Stopping auto-closure manager...');
    autoClosureManager.stop();
    console.log('   Auto-closure manager stopped');
    
    console.log('\n' + '='.repeat(60));
    console.log('AUTO-CLOSURE FEATURE DEMONSTRATION COMPLETE');
    console.log('='.repeat(60));
    
    console.log('\nHow it works in production:');
    console.log('- New calls are automatically added to monitoring');
    console.log('- Unit status changes reset activity timers');
    console.log('- After timeout period with no activity, calls are checked');
    console.log('- If all units are inactive (Available/Cleared/Returning), call is closed');
    console.log('- Manual closures remove calls from monitoring');
    console.log('- Comprehensive logging tracks all auto-closure activities');
    
    process.exit(0);
  }, 180000); // 3 minutes
}

// Configuration examples
console.log('\nAUTO-CLOSURE CONFIGURATION OPTIONS:');
console.log('====================================');

const exampleConfigs = [
  {
    name: 'Conservative (Default)',
    config: {
      timeoutMinutes: 30,
      checkIntervalMinutes: 5,
      requireAllUnitsInactive: true
    }
  },
  {
    name: 'Aggressive',
    config: {
      timeoutMinutes: 15,
      checkIntervalMinutes: 2,
      requireAllUnitsInactive: true
    }
  },
  {
    name: 'Relaxed',
    config: {
      timeoutMinutes: 60,
      checkIntervalMinutes: 10,
      requireAllUnitsInactive: true
    }
  }
];

exampleConfigs.forEach(example => {
  console.log(`\n${example.name}:`);
  console.log(`  Timeout: ${example.config.timeoutMinutes} minutes`);
  console.log(`  Check interval: ${example.config.checkIntervalMinutes} minutes`);
  console.log(`  All units must be inactive: ${example.config.requireAllUnitsInactive}`);
});

console.log('\nUnit Status Code that triggers closure:');
console.log('  10 = Out of Service (ONLY status that triggers closure)');

console.log('\nIntegration with MEDsync:');
console.log('- Auto-closure integrates with existing call processing');
console.log('- Works alongside SignalR events and polling mechanisms');
console.log('- Logs all actions to Google Sheets');
console.log('- Generates final XML with closure timestamps');
console.log('- Includes web monitoring endpoint: /auto-closure');

// Run the test
if (require.main === module) {
  testAutoClosureFeature().catch(console.error);
}

module.exports = { testAutoClosureFeature };