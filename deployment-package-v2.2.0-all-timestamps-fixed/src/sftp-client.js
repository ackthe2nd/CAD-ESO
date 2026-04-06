/**
 * Enhanced SFTP Client for Cloud Deployments
 * Optimized for Fly.io and other cloud platforms with specific connection handling
 */

const SftpClient = require('ssh2-sftp-client');
const logger = require('./fix-logger');

class CloudSftpClient {
  constructor(config) {
    this.config = config;
    this.sftp = new SftpClient();
    this.maxRetries = 3;
    this.retryDelay = 5000;
  }

  /**
   * Enhanced connection method for cloud environments - Fly.io optimized
   */
  async connect() {
    // Try multiple connection strategies for maximum compatibility
    const strategies = [
      // Strategy 1: Minimal configuration for Fly.io
      {
        name: 'Fly.io Minimal',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 180000,     // 3 minutes for slow cloud networks
          connectTimeout: 120000,   // 2 minutes connection timeout
          keepaliveInterval: 10000, // Less aggressive keepalive
          keepaliveCountMax: 3,
          tryKeyboard: false,
          authHandler: ['password'],
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1'],
            cipher: ['aes128-ctr', 'aes256-ctr'],
            hmac: ['hmac-sha2-256', 'hmac-sha1'],
            compress: ['none']
          }
        }
      },
      // Strategy 2: Legacy compatibility mode
      {
        name: 'Legacy Compatible',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 240000,     // 4 minutes maximum
          connectTimeout: 180000,   // 3 minutes connection timeout
          keepaliveInterval: 15000,
          keepaliveCountMax: 2,
          tryKeyboard: false,
          authHandler: ['password'],
          algorithms: {
            kex: ['diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1'],
            cipher: ['aes128-ctr', '3des-cbc'],
            hmac: ['hmac-sha1', 'hmac-md5'],
            compress: ['none']
          }
        }
      },
      // Strategy 3: Ultra-basic mode
      {
        name: 'Ultra Basic',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 300000,     // 5 minutes absolute maximum
          connectTimeout: 240000,   // 4 minutes connection timeout
          tryKeyboard: false,
          authHandler: ['password']
          // No algorithms specified - use SSH2 defaults
        }
      }
    ];

    let connectionError;
    
    // Try each strategy with retry logic
    for (const strategy of strategies) {
      logger.info(`Trying connection strategy: ${strategy.name}`);
      
      // Retry each strategy multiple times
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        try {
          logger.info(`SFTP connection attempt ${attempt}/${this.maxRetries} using ${strategy.name}`);
          
          await this.sftp.connect(strategy.config);
          
          // Test connection with a simple operation
          await this.sftp.cwd('/');
          
          logger.info(`SFTP connection established successfully using ${strategy.name} strategy`);
          return true;
          
        } catch (error) {
          connectionError = error;
          logger.warn(`Strategy ${strategy.name} attempt ${attempt} failed: ${error.message}`);
          
          // Close any partial connection
          await this.disconnect();
          
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * attempt; // Linear backoff for strategy attempts
            logger.info(`Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      // Wait before trying next strategy
      logger.info(`All attempts for ${strategy.name} failed, trying next strategy...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    throw new Error(`All SFTP connection strategies exhausted. Last error: ${connectionError.message}`);
  }

  /**
   * Upload file with enhanced error handling
   */
  async uploadFile(localPath, remotePath) {
    try {
      // Ensure we're connected
      if (!this.sftp.sftp) {
        await this.connect();
      }
      
      // Verify remote directory exists
      const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
      const remoteDirExists = await this.sftp.exists(remoteDir);
      
      if (!remoteDirExists) {
        throw new Error(`Remote directory ${remoteDir} does not exist`);
      }
      
      logger.info(`Uploading ${localPath} to ${remotePath}`);
      
      // Upload with progress monitoring for large files
      await this.sftp.put(localPath, remotePath, {
        writeStreamOptions: {
          flags: 'w',
          encoding: null,
          mode: 0o644
        },
        readStreamOptions: {
          flags: 'r',
          encoding: null
        }
      });
      
      // Verify upload success
      const uploadedFile = await this.sftp.exists(remotePath);
      if (!uploadedFile) {
        throw new Error('File upload verification failed - file not found on remote server');
      }
      
      logger.info(`Successfully uploaded file to ${remotePath}`);
      return true;
      
    } catch (error) {
      logger.error(`SFTP upload failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Graceful disconnect
   */
  async disconnect() {
    try {
      if (this.sftp && this.sftp.sftp) {
        await this.sftp.end();
        logger.info('SFTP connection closed');
      }
    } catch (error) {
      logger.warn(`Error during SFTP disconnect: ${error.message}`);
    }
  }

  /**
   * Test connection without uploading
   */
  async testConnection() {
    try {
      await this.connect();
      
      // Test basic operations
      await this.sftp.list('/');
      
      await this.disconnect();
      return true;
    } catch (error) {
      logger.error(`SFTP connection test failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = CloudSftpClient;