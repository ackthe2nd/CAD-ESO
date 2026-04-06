/**
 * Fly.io Optimized SFTP Client
 * Specifically designed to handle Fly.io's networking constraints and handshake issues
 */

const SftpClient = require('ssh2-sftp-client');
const { Client } = require('ssh2');
const logger = require('./fix-logger');
const fs = require('fs');

class FlyIoSftpClient {
  constructor(config) {
    this.config = config;
    this.maxRetries = 7;
    this.baseDelay = 2000;
    this.connectionPool = [];
    this.connectionTimeout = 45000; // 45 seconds max per attempt
    this.globalTimeout = 600000;    // 10 minutes total
  }

  /**
   * Ultra-conservative connection approach for Fly.io
   */
  async connect() {
    // Debug credentials (without exposing password)
    logger.info(`SFTP Connection Debug - Host: ${this.config.host}, User: ${this.config.username}, Port: ${this.config.port}`);
    logger.info(`Password configured: ${this.config.password ? 'Yes' : 'No'}`);
    
    // Validate required credentials
    if (!this.config.username || !this.config.password) {
      throw new Error(`SFTP credentials missing - Username: ${!!this.config.username}, Password: ${!!this.config.password}`);
    }
    
    // Enhanced Fly.io connection strategies with aggressive handshake prevention
    const flyIoConfigs = [
      {
        name: 'Fly.io Quick Connect',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 30000,     // 30 seconds - fast failure
          connectTimeout: 20000,   // 20 seconds - fast failure  
          keepaliveInterval: 0,
          tryKeyboard: false,
          forceIPv4: true,
          debug: false
        }
      },
      {
        name: 'Fly.io Aggressive TCP',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 45000,     // 45 seconds
          connectTimeout: 30000,   // 30 seconds
          keepaliveInterval: 15000, // 15 second keepalive
          keepaliveCountMax: 3,
          tryKeyboard: false,
          forceIPv4: true,
          sock: null,              // Let SSH2 handle socket creation
          algorithms: {
            kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group16-sha512'],
            cipher: ['aes128-ctr', 'aes192-ctr', 'aes256-ctr'],
            hmac: ['hmac-sha2-256', 'hmac-sha2-512'],
            compress: ['none', 'zlib@openssh.com']
          }
        }
      },
      {
        name: 'Fly.io Legacy Compatible',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 60000,     // 1 minute
          connectTimeout: 45000,   // 45 seconds
          keepaliveInterval: 10000,
          tryKeyboard: false,
          forceIPv4: true,
          algorithms: {
            kex: ['diffie-hellman-group1-sha1', 'diffie-hellman-group14-sha1'],
            cipher: ['aes128-cbc', '3des-cbc'],
            hmac: ['hmac-sha1', 'hmac-md5'],
            compress: ['none']
          }
        }
      },
      {
        name: 'Fly.io Raw Socket Fallback',
        useRawSocket: true,
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 90000,     // 1.5 minutes
          connectTimeout: 60000,   // 1 minute
          keepaliveInterval: 0,    // Disable for raw socket
          tryKeyboard: false,
          forceIPv4: true
        }
      }
    ];

    let lastError;

    for (const strategy of flyIoConfigs) {
      logger.info(`Attempting Fly.io SFTP connection with: ${strategy.name}`);
      
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        let sftp = null;
        let connectionTimeout = null;
        
        try {
          // Set per-attempt timeout to prevent hanging
          const connectPromise = new Promise(async (resolve, reject) => {
            try {
              if (strategy.useRawSocket) {
                // Use raw SSH2 client for maximum control
                sftp = await this.connectWithRawSocket(strategy.config);
              } else {
                // Use standard SFTP client with enhanced error handling
                sftp = new SftpClient();
                await sftp.connect(strategy.config);
              }
              resolve(sftp);
            } catch (error) {
              reject(error);
            }
          });
          
          // Race connection against timeout
          connectionTimeout = setTimeout(() => {
            logger.warn(`${strategy.name} attempt ${attempt} timed out after ${this.connectionTimeout}ms`);
            if (sftp) {
              try { sftp.end(); } catch (e) {}
            }
          }, this.connectionTimeout);
          
          sftp = await Promise.race([
            connectPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout)
            )
          ]);
          
          clearTimeout(connectionTimeout);
          
          // Minimal connection test with timeout
          const testPromise = sftp.cwd ? sftp.cwd('/') : sftp.realpath('/');
          await Promise.race([
            testPromise,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('CWD test timeout')), 10000)
            )
          ]);
          
          logger.info(`Fly.io SFTP connection successful with ${strategy.name} on attempt ${attempt}`);
          this.sftp = sftp;
          return true;
          
        } catch (error) {
          lastError = error;
          
          // Clear timeout if still active
          if (connectionTimeout) {
            clearTimeout(connectionTimeout);
          }
          
          // Enhanced error categorization
          const errorType = this.categorizeError(error);
          logger.warn(`${strategy.name} attempt ${attempt}/${this.maxRetries} failed (${errorType}): ${error.message}`);
          
          // Cleanup failed connection
          if (sftp) {
            try {
              await Promise.race([
                sftp.end ? sftp.end() : Promise.resolve(),
                new Promise(resolve => setTimeout(resolve, 5000))
              ]);
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          }
          
          // Skip retry for certain permanent errors
          if (errorType === 'AUTH_FAILURE' && attempt >= 2) {
            logger.error(`Authentication failed multiple times with ${strategy.name}, skipping remaining attempts`);
            break;
          }
          
          // Progressive delay with jitter
          if (attempt < this.maxRetries) {
            const baseDelay = this.baseDelay * Math.pow(1.2, attempt - 1);
            const jitter = Math.random() * 1000;
            const delay = baseDelay + jitter;
            logger.info(`Waiting ${Math.round(delay)}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }
      
      logger.warn(`Strategy ${strategy.name} exhausted all attempts`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    throw new Error(`Fly.io SFTP connection failed completely. Last error: ${lastError.message}`);
  }

  /**
   * Categorize errors for better retry logic
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('authentication') || message.includes('auth') || message.includes('password')) {
      return 'AUTH_FAILURE';
    } else if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT';
    } else if (message.includes('connection refused') || message.includes('econnrefused')) {
      return 'CONNECTION_REFUSED';
    } else if (message.includes('handshake') || message.includes('before handshake')) {
      return 'HANDSHAKE_FAILURE';
    } else if (message.includes('network') || message.includes('unreachable')) {
      return 'NETWORK_ERROR';
    } else {
      return 'UNKNOWN';
    }
  }

  /**
   * Raw socket connection for maximum compatibility
   */
  async connectWithRawSocket(config) {
    return new Promise((resolve, reject) => {
      const ssh = new Client();
      let sftpStream = null;
      
      const cleanup = () => {
        if (sftpStream) {
          try { sftpStream.end(); } catch (e) {}
        }
        try { ssh.end(); } catch (e) {}
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Raw socket connection timeout'));
      }, config.connectTimeout || 300000);

      ssh.on('ready', () => {
        logger.debug('Raw SSH connection ready, requesting SFTP...');
        
        ssh.sftp((err, sftp) => {
          clearTimeout(timeout);
          
          if (err) {
            cleanup();
            reject(err);
            return;
          }
          
          sftpStream = sftp;
          
          // Wrap raw SFTP in compatible interface
          const sftpWrapper = {
            sftp: sftpStream,
            async cwd(path) {
              return new Promise((resolve, reject) => {
                sftpStream.realpath(path || '/', (err, absPath) => {
                  if (err) reject(err);
                  else resolve(absPath);
                });
              });
            },
            async put(localPath, remotePath) {
              return new Promise((resolve, reject) => {
                const readStream = fs.createReadStream(localPath);
                const writeStream = sftpStream.createWriteStream(remotePath);
                
                writeStream.on('close', resolve);
                writeStream.on('error', reject);
                readStream.on('error', reject);
                
                readStream.pipe(writeStream);
              });
            },
            async exists(path) {
              return new Promise((resolve) => {
                sftpStream.stat(path, (err, stats) => {
                  resolve(!err && stats);
                });
              });
            },
            async end() {
              cleanup();
            }
          };
          
          resolve(sftpWrapper);
        });
      });

      ssh.on('error', (err) => {
        clearTimeout(timeout);
        cleanup();
        reject(err);
      });

      ssh.connect(config);
    });
  }

  /**
   * Upload file with enhanced Fly.io connection management
   */
  async uploadFile(localPath, remotePath) {
    const maxUploadRetries = 3;
    let lastError;

    for (let uploadAttempt = 1; uploadAttempt <= maxUploadRetries; uploadAttempt++) {
      try {
        // Ensure fresh connection for each upload attempt
        if (!this.sftp || uploadAttempt > 1) {
          logger.info(`Establishing fresh SFTP connection for upload attempt ${uploadAttempt}`);
          if (this.sftp) {
            try { await this.sftp.end(); } catch (e) {}
            this.sftp = null;
          }
          await this.connect();
        }

        // Verify local file exists
        if (!fs.existsSync(localPath)) {
          throw new Error(`Local file not found: ${localPath}`);
        }

        const fileSize = fs.statSync(localPath).size;
        logger.info(`Uploading ${localPath} (${fileSize} bytes) to ${remotePath} via Fly.io SFTP (attempt ${uploadAttempt})`);

        // Enhanced upload with timeout protection
        const uploadPromise = this.sftp.put(localPath, remotePath);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload timeout after 120 seconds')), 120000)
        );

        await Promise.race([uploadPromise, timeoutPromise]);

        // Verify upload with timeout
        const verifyPromise = this.sftp.exists(remotePath);
        const verifyTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Upload verification timeout')), 30000)
        );

        const uploaded = await Promise.race([verifyPromise, verifyTimeoutPromise]);
        
        if (!uploaded) {
          throw new Error('Upload verification failed - file not found after upload');
        }

        logger.info(`Fly.io SFTP upload successful: ${remotePath} (${fileSize} bytes)`);
        return true;

      } catch (error) {
        lastError = error;
        const errorType = this.categorizeError(error);
        logger.warn(`Upload attempt ${uploadAttempt}/${maxUploadRetries} failed (${errorType}): ${error.message}`);

        // Clean up connection on error
        if (this.sftp) {
          try { await this.sftp.end(); } catch (e) {}
          this.sftp = null;
        }

        // Don't retry for auth failures
        if (errorType === 'AUTH_FAILURE') {
          throw error;
        }

        // Add delay between upload retries
        if (uploadAttempt < maxUploadRetries) {
          const delay = 3000 * uploadAttempt;
          logger.info(`Waiting ${delay}ms before upload retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Upload failed after ${maxUploadRetries} attempts. Last error: ${lastError.message}`);
  }

  /**
   * Disconnect with proper cleanup
   */
  async disconnect() {
    if (this.sftp) {
      try {
        await this.sftp.end();
        logger.info('Fly.io SFTP connection closed');
      } catch (error) {
        logger.warn(`Fly.io SFTP disconnect error: ${error.message}`);
      } finally {
        this.sftp = null;
      }
    }
  }

  /**
   * Test connection without full upload
   */
  async testConnection() {
    try {
      await this.connect();
      await this.disconnect();
      return true;
    } catch (error) {
      logger.error(`Fly.io SFTP test failed: ${error.message}`);
      return false;
    }
  }
}

module.exports = FlyIoSftpClient;