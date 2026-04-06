/**
 * Script to test SignalR connection and echo any received CallAdded events
 */
require('dotenv').config();
const signalR = require('@microsoft/signalr');

// Log function for console output
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '🛑 ERROR' : '➡️';
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

/**
 * Test connection to SignalR hub
 */
async function testSignalRConnection() {
  try {
    log('Starting SignalR connection test...');
    
    // Create SignalR connection with detailed logging
    const connection = new signalR.HubConnectionBuilder()
      .withUrl('https://events.resgrid.com/eventingHub')
      .withAutomaticReconnect({
        nextRetryDelayInMilliseconds: retryContext => {
          if (retryContext.elapsedMilliseconds > 60000) {
            return null; // Stop retrying after 60 seconds
          }
          // Exponential backoff
          return Math.min(Math.pow(2, retryContext.previousRetryCount) * 1000, 30000);
        }
      })
      .configureLogging(signalR.LogLevel.Information)
      .build();
    
    // Set up connection status handlers with detailed logging
    connection.onreconnecting((error) => {
      log(`SignalR connection lost. Attempting to reconnect... ${error ? error.message : ''}`, true);
    });
    
    connection.onreconnected((connectionId) => {
      log(`SignalR connection reestablished. ConnectionId: ${connectionId}`);
    });
    
    connection.onclose((error) => {
      log(`SignalR connection closed: ${error ? error.message : ''}`, true);
    });
    
    // Set up event handlers for different types of Resgrid events
    connection.on('CallAdded', (callData) => {
      log('🚨 Received CallAdded event');
      console.log('Call data:', JSON.stringify(callData, null, 2));
    });
    
    connection.on('CallStatusChanged', (callData) => {
      log('🔄 Received CallStatusChanged event');
      console.log('Call status data:', JSON.stringify(callData, null, 2));
    });
    
    connection.on('UnitStatusUpdated', (unitData) => {
      log('🚒 Received UnitStatusUpdated event');
      console.log('Unit status data:', JSON.stringify(unitData, null, 2));
    });
    
    // Start the connection
    await connection.start();
    log(`✅ Connected to Resgrid SignalR hub. ConnectionId: ${connection.connectionId}`);
    log('Listening for events...');
    log('Press Ctrl+C to exit');
    
    // Keep the script running
    process.stdin.resume();
    
    // Setup clean shutdown
    process.on('SIGINT', async () => {
      log('Shutting down test...');
      await connection.stop();
      process.exit(0);
    });
  } catch (error) {
    log(`Failed to connect to SignalR hub: ${error.message}`, true);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testSignalRConnection();