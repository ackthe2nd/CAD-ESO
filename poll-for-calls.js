/**
 * Call Polling Service for Resgrid to ESO Bridge
 * 
 * This script periodically polls the Resgrid API for new calls and logs them to Google Sheets.
 * It serves as a backup to the SignalR connection to ensure all calls are properly logged.
 */
require('dotenv').config();
const axios = require('axios');
const { getApiToken } = require('./src/token-manager');
const { sheetCallRow } = require('./src/sheets-logger');
const logger = require('./src/fix-logger');

// Configuration
const POLL_INTERVAL = 60 * 1000; // Poll every 60 seconds
const LOOKBACK_WINDOW = 10 * 60 * 1000; // Look for calls in the last 10 minutes
let lastPollTime = new Date(Date.now() - LOOKBACK_WINDOW); // Initialize with lookback window
let processedCallIds = new Set(); // Keep track of processed calls to avoid duplicates

/**
 * Fetch recent calls from Resgrid API
 */
async function fetchRecentCalls(token) {
  try {
    logger.info('Fetching recent calls from Resgrid API...');
    
    // Use the working GetActiveCalls endpoint first
    try {
      logger.info('Trying Calls/GetActiveCalls endpoint...');
      
      const response = await axios({
        method: 'GET',
        url: 'https://api.resgrid.com/api/v4/Calls/GetActiveCalls',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.data && response.data.Data) {
        logger.info(`Found ${response.data.Data.length} active calls`);
        return response.data.Data;
      }
    } catch (error) {
      logger.warn(`Error fetching active calls: ${error.message}`);
    }
    
    // Fall back to GetCalls with date parameters
    const startDate = new Date(lastPollTime.getTime() - LOOKBACK_WINDOW); // Add extra buffer
    const endDate = new Date();
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    logger.info(`Falling back to date range search: ${startDateStr} to ${endDateStr}`);
    
    const response = await axios({
      method: 'GET',
      url: 'https://api.resgrid.com/api/v4/Calls/GetCalls',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        startDate: startDateStr,
        endDate: endDateStr
      }
    });
    
    if (response.data && Array.isArray(response.data)) {
      logger.info(`Found ${response.data.length} recent calls via GetCalls endpoint`);
      return response.data;
    }
    
    return [];
  } catch (error) {
    logger.error(`Error fetching recent calls: ${error.message}`);
    return [];
  }
}

/**
 * Fetch extra data for a specific call ID
 */
async function getCallExtraData(token, callId) {
  try {
    logger.info(`Fetching extra data for call ${callId}...`);
    
    const response = await axios({
      method: 'GET',
      url: `https://api.resgrid.com/api/v4/Calls/GetCallExtraData`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      params: {
        callId: callId
      }
    });
    
    if (response.data) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    logger.error(`Error fetching call extra data: ${error.message}`);
    return null;
  }
}

/**
 * Check if a call is new based on timestamp and our last poll time
 */
function isNewCall(call) {
  // Skip already processed calls
  if (processedCallIds.has(call.CallId)) {
    return false;
  }
  
  // Parse call timestamp
  let callTimestamp;
  if (call.LoggedOn) {
    callTimestamp = new Date(call.LoggedOn);
  } else if (call.Timestamp) {
    callTimestamp = new Date(call.Timestamp);
  } else {
    // If no timestamp, consider it new (better to process again than miss it)
    return true;
  }
  
  // Check if call is newer than last poll time
  return callTimestamp >= lastPollTime;
}

/**
 * Poll for new calls and log them to Google Sheets
 */
async function pollForCalls() {
  try {
    const token = await getApiToken();
    if (!token) {
      logger.error('Failed to get API token, skipping poll');
      return;
    }
    
    const calls = await fetchRecentCalls(token);
    
    if (calls.length === 0) {
      logger.info('No calls found in this poll interval');
      return;
    }
    
    let newCallCount = 0;
    
    // Process each call
    for (const call of calls) {
      try {
        // Skip calls we've already processed
        if (!isNewCall(call)) {
          continue;
        }
        
        newCallCount++;
        logger.info(`Processing call ${call.CallId}: ${call.Name || 'Unnamed call'}`);
        
        // Fetch extra data
        const extraData = await getCallExtraData(token, call.CallId);
        
        // Log to Google Sheets
        logger.info(`Logging call ${call.CallId} to Google Sheets...`);
        const success = await sheetCallRow(call, extraData || {});
        
        if (success) {
          logger.info(`Successfully logged call ${call.CallId} to Google Sheets`);
          // Add to processed set to avoid duplicate processing
          processedCallIds.add(call.CallId);
        } else {
          logger.error(`Failed to log call ${call.CallId} to Google Sheets`);
        }
      } catch (error) {
        logger.error(`Error processing call ${call.CallId}: ${error.message}`);
      }
    }
    
    logger.info(`Processed ${newCallCount} new calls out of ${calls.length} total calls`);
    
    // Update last poll time
    lastPollTime = new Date();
    
    // Clean up processedCallIds to prevent memory growth
    if (processedCallIds.size > 1000) {
      logger.info('Cleaning up processed calls tracking set');
      const oldestToKeep = new Date(Date.now() - (24 * 60 * 60 * 1000)); // 24 hours
      
      // Keep only calls from the last 24 hours
      for (const callId of processedCallIds) {
        const callData = calls.find(c => c.CallId === callId);
        if (!callData) {
          processedCallIds.delete(callId);
          continue;
        }
        
        const callTime = new Date(callData.LoggedOn || callData.Timestamp || 0);
        if (callTime < oldestToKeep) {
          processedCallIds.delete(callId);
        }
      }
      
      logger.info(`Cleaned up processed calls tracking set: ${processedCallIds.size} remaining`);
    }
  } catch (error) {
    logger.error(`Error polling for calls: ${error.message}`);
  }
}

// Main function
async function main() {
  logger.info('Starting call polling service...');
  
  // Do an initial poll immediately
  await pollForCalls();
  
  // Set up regular polling interval
  setInterval(pollForCalls, POLL_INTERVAL);
  logger.info(`Call polling service started, polling every ${POLL_INTERVAL / 1000} seconds`);
  
  // Keep the process running
  process.stdin.resume();
  
  // Handle process termination
  process.on('SIGINT', () => {
    logger.info('Call polling service stopped');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    logger.info('Call polling service stopped');
    process.exit(0);
  });
}

// Start the service
main().catch(error => {
  logger.error(`Unhandled error: ${error.message}`);
  process.exit(1);
});