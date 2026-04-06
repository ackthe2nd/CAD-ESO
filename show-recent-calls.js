/**
 * Resgrid to ESO Bridge - Show Recent Calls Utility
 * 
 * This script fetches and displays recent calls from Resgrid API
 * without processing or generating XML files.
 * 
 * Usage:
 *   node show-recent-calls.js [--days=N]
 *   where N is the number of days to look back (default: 7)
 */
require('dotenv').config();
const { logger } = require('./src/logger');
const { getRecentCalls } = require('./src/resgrid-api');
const { mapPriorityToEsoCode } = require('./src/utils/priority');

// Parse command line arguments
const args = process.argv.slice(2);
const daysArg = args.find(arg => arg.startsWith('--days='));
const days = daysArg ? parseInt(daysArg.split('=')[1]) : 7;

/**
 * Format a date string for display
 */
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString();
  } catch (e) {
    return dateString;
  }
}

/**
 * Display a call in a readable format
 */
function displayCall(call, index) {
  // Map the priority code if available
  let responseMode = 'Default';
  if (call.Priority && call.Priority.Id) {
    responseMode = `${mapPriorityToEsoCode(call.Priority.Id)} (${call.Priority.Name || 'Unknown'})`;
  }
  
  console.log(`\n===== Call #${index + 1} =====`);
  console.log(`ID: ${call.CallId}`);
  console.log(`Nature: ${call.Name || 'Unknown'}`);
  console.log(`Address: ${call.Address || 'Unknown'}`);
  console.log(`Priority: ${responseMode}`);
  console.log(`Timestamp: ${formatDate(call.LoggedOn || call.Timestamp)}`);
  console.log(`State: ${call.State || 'Unknown'}`);
  
  if (call.Dispatches && Array.isArray(call.Dispatches)) {
    const units = call.Dispatches
      .filter(d => d.Type === 'Unit')
      .map(d => d.Name);
    
    console.log(`Units: ${units.join(', ') || 'None'}`);
  }
  
  console.log(`Notes: ${call.Notes || 'None'}`);
}

/**
 * Main function
 */
async function main() {
  try {
    logger.info(`Fetching calls from last ${days} days...`);
    
    const calls = await getRecentCalls(days);
    
    if (!calls || calls.length === 0) {
      console.log('\nNo active calls found');
      return;
    }
    
    console.log(`\nFound ${calls.length} calls from the last ${days} days:`);
    calls.forEach((call, index) => displayCall(call, index));
    
    // Print a summary of the priority distribution
    const priorityCounts = {};
    calls.forEach(call => {
      if (call.Priority && call.Priority.Id) {
        const priorityId = call.Priority.Id;
        priorityCounts[priorityId] = (priorityCounts[priorityId] || 0) + 1;
      }
    });
    
    console.log('\n===== Priority Distribution =====');
    Object.entries(priorityCounts).forEach(([priorityId, count]) => {
      const esoCode = mapPriorityToEsoCode(priorityId);
      console.log(`Priority ID ${priorityId}: ${count} calls (ESO code: ${esoCode})`);
    });
    
  } catch (error) {
    logger.error(`Failed to fetch calls: ${error.message}`, { error });
    console.error(`\nError: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();