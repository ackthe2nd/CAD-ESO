require('dotenv').config();

// Configuration validation function is now a utility export
function validateConfig() {
  const requiredVars = [
    'RESGRID_USER',  // Username for Resgrid authentication
    'RESGRID_PASS',  // Password for Resgrid authentication
  ];
  
  // SFTP variables will be checked at the time of upload, not startup
  const sftpVars = [
    'SFTP_HOST',
    'SFTP_USER',
    'SFTP_PASS',
    'SFTP_DIR'
  ];
  
  const result = {
    missingAuth: [],
    missingSftp: []
  };
  
  result.missingAuth = requiredVars.filter(varName => !process.env[varName]);
  result.missingSftp = sftpVars.filter(varName => !process.env[varName]);
  
  return result;
}

// Perform validation but just log, don't exit
const validationResult = validateConfig();
if (validationResult.missingAuth.length > 0) {
  console.warn(`Warning: Missing authentication variables: ${validationResult.missingAuth.join(', ')}`);
}
if (validationResult.missingSftp.length > 0) {
  console.warn(`Warning: Missing SFTP variables: ${validationResult.missingSftp.join(', ')}`);
}

// Export the configuration
exports.config = {
  resgrid: {
    eventsUrl: 'https://events.resgrid.com/eventingHub',
    apiUrl: 'https://api.resgrid.com/api/v4',
    user: process.env.RESGRID_USER,
    pass: process.env.RESGRID_PASS,
    // token will be dynamically obtained using user/pass
    token: null
  },
  sftp: {
    host: process.env.SFTP_HOST,
    port: parseInt(process.env.SFTP_PORT) || 22,
    username: process.env.SFTP_USER || process.env.SFTP_USERNAME,
    password: process.env.SFTP_PASS || process.env.SFTP_PASSWORD,
    remotePath: process.env.SFTP_DIR || process.env.SFTP_REMOTE_PATH
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  },
  esoGuid: 'b394de98-a5b7-408d-a1f2-020eddff92b9'
};
