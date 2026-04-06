const winston = require('winston');
require('dotenv').config();

// Get log level from environment or use default
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Define custom format with timestamp and colorized output
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr ? `\n${metaStr}` : ''}`;
  })
);

// Create the logger instance
const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: customFormat,
  transports: [
    // Console transport for all logs
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      )
    }),
    // File transport for errors
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // File transport for all logs
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    })
  ]
});

// Add process exception handlers
logger.exceptions.handle(
  new winston.transports.File({ filename: 'logs/exceptions.log' })
);

// Export the logger
module.exports = { logger };
