const SftpClient = require('ssh2-sftp-client');
const fs = require('fs');
const crypto = require('crypto');
const { config } = require('./config');
const { logger } = require('./logger');
const { withRetry } = require('./retry-util');

// In-memory cache for file fingerprints
const fileFingerprints = new Map();

/**
 * Calculates a fingerprint (SHA-256 hash) for a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - SHA-256 hash of the file content
 */
async function calculateFileFingerprint(filePath) {
  return new Promise((resolve, reject) => {
    try {
      const hash = crypto.createHash('sha256');
      const stream = fs.createReadStream(filePath);
      
      stream.on('data', data => hash.update(data));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', error => reject(error));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Checks if a file has changed since the last upload
 * @param {string} filePath - Path to the file
 * @param {string} remoteFilePath - The remote path where the file would be saved
 * @returns {Promise<boolean>} - True if the file has changed, false otherwise
 */
async function hasFileChanged(filePath, remoteFilePath) {
  try {
    // Calculate the new fingerprint
    const newFingerprint = await calculateFileFingerprint(filePath);
    
    // Get the old fingerprint from the cache
    const cacheKey = `${filePath}:${remoteFilePath}`;
    const oldFingerprint = fileFingerprints.get(cacheKey);
    
    // Update the cache with the new fingerprint
    fileFingerprints.set(cacheKey, newFingerprint);
    
    // If there's no old fingerprint, consider the file as changed
    if (!oldFingerprint) {
      logger.debug(`No previous fingerprint found for ${filePath}, considering it changed`);
      return true;
    }
    
    // Compare the fingerprints
    const hasChanged = newFingerprint !== oldFingerprint;
    if (!hasChanged) {
      logger.debug(`File ${filePath} has not changed since last upload (fingerprint: ${newFingerprint})`);
    } else {
      logger.debug(`File ${filePath} has changed (old: ${oldFingerprint}, new: ${newFingerprint})`);
    }
    
    return hasChanged;
  } catch (error) {
    // If there's an error calculating the fingerprint, assume the file has changed
    logger.warn(`Error calculating fingerprint for ${filePath}: ${error.message}`);
    return true;
  }
}

/**
 * Uploads a file to the SFTP server with enhanced retry logic
 * @param {string} localFilePath - The local path to the file to upload
 * @param {string} remoteFilePath - The remote path where the file should be saved
 * @returns {Promise<boolean>} - True if successful, false if unchanged, throws error otherwise
 */
async function uploadFileToSFTP(localFilePath, remoteFilePath) {
  // First check if the file has changed since the last upload
  const hasChanged = await hasFileChanged(localFilePath, remoteFilePath);
  
  if (!hasChanged) {
    logger.info(`Skipping upload of ${localFilePath} to ${remoteFilePath} - file has not changed`);
    return false; // File has not changed, no need to upload
  }
  
  return withRetry(
    async () => {
      const sftp = new SftpClient();
      
      try {
        logger.info(`Connecting to SFTP server at ${config.sftp.host}:${config.sftp.port}`);
        
        await sftp.connect({
          host: config.sftp.host,
          port: config.sftp.port,
          username: config.sftp.username,
          password: config.sftp.password,
          retries: 3,
          retry_factor: 2,
          retry_minTimeout: 2000
        });
        
        logger.info(`Connected to SFTP server. Uploading file to ${remoteFilePath}`);
        
        // Check if the remote directory exists
        const remoteDir = remoteFilePath.substring(0, remoteFilePath.lastIndexOf('/'));
        const dirExists = await sftp.exists(remoteDir);
        
        // Create directory if it doesn't exist
        if (!dirExists) {
          logger.info(`Remote directory ${remoteDir} does not exist. Creating it...`);
          await sftp.mkdir(remoteDir, true);
        }
        
        // Upload the file
        await sftp.put(localFilePath, remoteFilePath);
        logger.info(`File successfully uploaded to ${remoteFilePath}`);
        
        return true;
      } catch (error) {
        logger.error(`SFTP upload failed: ${error.message}`, { error });
        throw error;
      } finally {
        // Always disconnect from the SFTP server
        try {
          await sftp.end();
          logger.info('Disconnected from SFTP server');
        } catch (endError) {
          logger.warn(`Error disconnecting from SFTP server: ${endError.message}`);
        }
      }
    },
    {
      maxRetries: 5,
      initialDelay: 3000,
      maxDelay: 60000,
      exponential: true,
      operationName: 'SFTP file upload',
      shouldRetry: (error) => {
        // Retry on network errors, timeout errors, or connection errors
        // Don't retry on authentication errors or permission errors
        const nonRetryableErrors = [
          'authentication', 'permission denied', 'invalid credentials',
          'authorization', 'access denied'
        ];
        
        // Check if the error message contains any non-retryable phrases
        return !nonRetryableErrors.some(phrase => 
          error.message.toLowerCase().includes(phrase)
        );
      }
    }
  );
}

/**
 * Clear the fingerprint cache for a specific file or all files
 * @param {string} filePath - Optional path to clear a specific file's fingerprint
 */
function clearFingerprintCache(filePath) {
  if (filePath) {
    // Clear for a specific file (all remote paths)
    const keysToRemove = [];
    for (const key of fileFingerprints.keys()) {
      if (key.startsWith(filePath + ':')) {
        keysToRemove.push(key);
      }
    }
    
    for (const key of keysToRemove) {
      fileFingerprints.delete(key);
    }
    
    logger.debug(`Cleared fingerprint cache for ${filePath} (${keysToRemove.length} entries)`);
  } else {
    // Clear all fingerprints
    const count = fileFingerprints.size;
    fileFingerprints.clear();
    logger.debug(`Cleared all fingerprint cache entries (${count} entries)`);
  }
}

module.exports = { 
  uploadFileToSFTP,
  hasFileChanged,
  calculateFileFingerprint,
  clearFingerprintCache
};
