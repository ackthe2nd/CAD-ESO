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
    this.maxRetries = 5;
    this.baseDelay = 3000;
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
    
    // Fly.io specific connection configurations
    const flyIoConfigs = [
      {
        name: 'Fly.io Ultra Conservative',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 300000,    // 5 minutes
          connectTimeout: 180000,  // 3 minutes
          keepaliveInterval: 0,    // Disable keepalive initially
          tryKeyboard: false,
          forceIPv4: true,         // Force IPv4 for Fly.io
          algorithms: {
            kex: ['diffie-hellman-group1-sha1'],
            cipher: ['3des-cbc', 'aes128-cbc'],
            hmac: ['hmac-sha1', 'hmac-md5'],
            compress: ['none']
          }
        }
      },
      {
        name: 'Fly.io Basic SSH2',
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 400000,    // 6+ minutes
          connectTimeout: 240000,  // 4 minutes
          tryKeyboard: false,
          forceIPv4: true
          // No algorithms - let SSH2 negotiate
        }
      },
      {
        name: 'Fly.io Raw Socket',
        useRawSocket: true,
        config: {
          host: this.config.host,
          port: this.config.port || 22,
          username: this.config.username,
          password: this.config.password,
          readyTimeout: 500000,    // 8+ minutes
          connectTimeout: 300000,  // 5 minutes
          tryKeyboard: false,
          forceIPv4: true,
          keepaliveInterval: 0
        }
      }
    ];

    let lastError;

    for (const strategy of flyIoConfigs) {
      logger.info(`Attempting Fly.io SFTP connection with: ${strategy.name}`);
      
      for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
        let sftp = null;
        
        try {
          if (strategy.useRawSocket) {
            // Use raw SSH2 client for maximum control
            sftp = await this.connectWithRawSocket(strategy.config);
          } else {
            // Use standard SFTP client
            sftp = new SftpClient();
            await sftp.connect(strategy.config);
          }
          
          // Minimal connection test
          await sftp.cwd('/');
          
          logger.info(`Fly.io SFTP connection successful with ${strategy.name} on attempt ${attempt}`);
          this.sftp = sftp;
          return true;
          
        } catch (error) {
          lastError = error;
          logger.warn(`${strategy.name} attempt ${attempt}/${this.maxRetries} failed: ${error.message}`);
          
          // Cleanup failed connection
          if (sftp) {
            try {
              await sftp.end();
            } catch (cleanupError) {
              // Ignore cleanup errors
            }
          }
          
          // Progressive delay
          if (attempt < this.maxRetries) {
            const delay = this.baseDelay * Math.pow(1.5, attempt - 1);
            logger.info(`Waiting ${delay}ms before retry...`);
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
   * Upload file with Fly.io optimizations
   */
  async uploadFile(localPath, remotePath) {
    if (!this.sftp) {
      await this.connect();
    }

    try {
      // Verify local file exists
      if (!fs.existsSync(localPath)) {
        throw new Error(`Local file not found: ${localPath}`);
      }

      // Check remote directory
      const remoteDir = remotePath.substring(0, remotePath.lastIndexOf('/'));
      const dirExists = await this.sftp.exists(remoteDir);
      
      if (!dirExists) {
        throw new Error(`Remote directory ${remoteDir} does not exist`);
      }

      logger.info(`Uploading ${localPath} to ${remotePath} via Fly.io SFTP`);
      
      // Upload with minimal options
      await this.sftp.put(localPath, remotePath);
      
      // Verify upload
      const uploaded = await this.sftp.exists(remotePath);
      if (!uploaded) {
        throw new Error('Upload verification failed');
      }

      logger.info(`Fly.io SFTP upload successful: ${remotePath}`);
      return true;

    } catch (error) {
      logger.error(`Fly.io SFTP upload failed: ${error.message}`);
      throw error;
    }
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