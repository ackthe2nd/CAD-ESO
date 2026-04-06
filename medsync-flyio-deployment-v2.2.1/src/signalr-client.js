const signalR = require('@microsoft/signalr');
const { logger } = require('./logger');
const { config } = require('./config');

class SignalRClient {
  constructor() {
    this.connection = null;
    this.callAddedCallback = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000; // 5 seconds
  }

  async connect() {
    try {
      logger.info('Connecting to Resgrid SignalR hub...');
      
      this.connection = new signalR.HubConnectionBuilder()
        .withUrl(config.resgrid.eventsUrl)
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: retryContext => {
            if (retryContext.elapsedMilliseconds > 60000) {
              // If we've been trying to reconnect for more than 60 seconds, stop
              return null;
            }
            // Implement exponential backoff
            return Math.min(Math.pow(2, retryContext.previousRetryCount) * 1000, 30000);
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Add event handlers
      this.connection.on('CallAdded', (callData) => {
        if (this.callAddedCallback) {
          this.callAddedCallback(callData);
        }
      });

      // Add connection status handlers
      this.connection.onreconnecting((error) => {
        logger.warn(`SignalR connection lost. Attempting to reconnect... Error: ${error ? error.message : 'Unknown'}`);
      });

      this.connection.onreconnected((connectionId) => {
        logger.info(`SignalR connection reestablished. ConnectionId: ${connectionId}`);
        this.reconnectAttempts = 0;
      });

      this.connection.onclose((error) => {
        logger.error(`SignalR connection closed. Error: ${error ? error.message : 'Unknown'}`);
        this.handleConnectionClosed();
      });

      // Start the connection
      await this.connection.start();
      logger.info(`Connected to Resgrid SignalR hub. ConnectionId: ${this.connection.connectionId}`);
    } catch (error) {
      logger.error(`Failed to connect to SignalR hub: ${error.message}`, { error });
      this.handleConnectionClosed();
      throw error;
    }
  }

  handleConnectionClosed() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      logger.info(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay / 1000} seconds...`);
      
      setTimeout(async () => {
        try {
          await this.connect();
        } catch (error) {
          logger.error(`Reconnect attempt failed: ${error.message}`);
        }
      }, this.reconnectDelay);
    } else {
      logger.error(`Maximum reconnect attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
    }
  }

  onCallAdded(callback) {
    this.callAddedCallback = callback;
    logger.info('Registered callback for CallAdded events');
  }

  async disconnect() {
    if (this.connection) {
      try {
        await this.connection.stop();
        logger.info('Disconnected from Resgrid SignalR hub');
      } catch (error) {
        logger.error(`Error disconnecting from SignalR hub: ${error.message}`, { error });
      }
    }
  }
}

module.exports = { SignalRClient };
