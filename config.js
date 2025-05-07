/**
 * Centralized configuration for the Resgrid ESO Bridge
 */
require('dotenv').config();
const path = require('path');

// Load configuration from environment variables
const config = {
  resgrid: {
    baseUrl: 'https://api.resgrid.com/api/v4',
    eventsUrl: 'https://events.resgrid.com/eventingHub',
    username: process.env.RESGRID_USER,
    password: process.env.RESGRID_PASS,
    tokenEndpoint: 'Connect/token'
  },
  sftp: {
    host: process.env.SFTP_HOST || 'sftp.esosuite.net',
    port: parseInt(process.env.SFTP_PORT || '22'),
    username: process.env.SFTP_USER || process.env.SFTP_USERNAME || 'CAD_12345',
    password: process.env.SFTP_PASS || process.env.SFTP_PASSWORD || '',
    remotePath: process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH || '/incoming'
  },
  app: {
    debug: process.env.DEBUG === 'true',
    logsDir: process.env.LOGS_DIR || './logs',
    maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.RETRY_DELAY || '5000'),
    pollingInterval: parseInt(process.env.CALL_POLLING_INTERVAL || '30') * 1000,
    port: parseInt(process.env.PORT || '8080')
  },
  esoGuid: process.env.ESO_GUID || 'b394de98-a5b7-408d-a1f2-020eddff92b9'
};

// Validate required configuration
function validateConfig() {
  const requiredVars = [
    { path: 'resgrid.username', name: 'RESGRID_USER' },
    { path: 'resgrid.password', name: 'RESGRID_PASS' }
  ];
  
  const missingVars = requiredVars.filter(v => {
    const pathParts = v.path.split('.');
    let obj = config;
    for (const part of pathParts) {
      obj = obj[part];
      if (!obj) return true;
    }
    return false;
  });
  
  if (missingVars.length > 0) {
    console.error('Missing required environment variables:');
    missingVars.forEach(v => console.error(`- ${v.name}`));
    console.error('Please set these variables in your .env file');
    process.exit(1);
  }
  
  // Log current configuration for debugging
  console.log('Environment configuration:');
  console.log(`  RESGRID_USER: ${config.resgrid.username ? '✓ Set' : '✗ Missing'}`);
  console.log(`  RESGRID_PASS: ${config.resgrid.password ? '✓ Set' : '✗ Missing'}`);
  console.log(`  SFTP_HOST: ${config.sftp.host}`);
  console.log(`  SFTP_USER: ${config.sftp.username} (from ${process.env.SFTP_USER ? 'SFTP_USER' : 'SFTP_USERNAME'})`);
  console.log(`  SFTP_DIR: ${config.sftp.remotePath} (from ${process.env.SFTP_DIR ? 'SFTP_DIR' : 'SFTP_REMOTE_PATH'})`);
}

// Perform validation on initial load
validateConfig();

module.exports = { config };