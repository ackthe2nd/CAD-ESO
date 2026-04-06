const SftpClient = require('ssh2-sftp-client');
const { config } = require('./config');
const { logger } = require('./logger');

/**
 * Uploads a file to the SFTP server
 * @param {string} localFilePath - The local path to the file to upload
 * @param {string} remoteFilePath - The remote path where the file should be saved
 * @returns {Promise<boolean>} - True if successful, throws error otherwise
 */
async function uploadFileToSFTP(localFilePath, remoteFilePath) {
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
}

module.exports = { uploadFileToSFTP };
