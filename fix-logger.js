/**
 * Basic fix to test logger functionality
 */
const winston = require('winston');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Created logs directory: ${logsDir}`);
}

// Configure basic winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          info => `${info.timestamp} [${info.level}]: ${info.message}`
        )
      ),
    }),
    // File output - regular logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'application.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Export the logger
module.exports = logger;

// Test the logger
logger.info('Logger test successful');