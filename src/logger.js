/**
 * Logger for Resgrid-ESO Bridge
 * Provides structured logging with Google Sheets integration
 */
const winston = require('winston');
const fs = require('fs');
const path = require('path');
const { sheetLog } = require('./sheets-logger');

// Create logs directory if it doesn't exist
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log(`Created logs directory: ${logsDir}`);
}

// Configure winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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
    // File output - error logs
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

/**
 * Enhanced logging function that also logs to Google Sheets
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} metadata - Additional data to log
 */
function enhancedLog(level, message, metadata = {}) {
  // Log using winston
  if (metadata && Object.keys(metadata).length > 0) {
    logger[level](message, metadata);
  } else {
    logger[level](message);
  }
  
  // Also log to Google Sheets, but don't wait for the result to avoid blocking
  sheetLog(message, level).catch(err => {
    logger.warn(`Failed to log to Google Sheets: ${err.message}`);
  });
}

/**
 * Legacy logging function for backward compatibility
 * This wraps console.log but also sends logs to Google Sheets
 * @param {string} message - Log message
 * @param {boolean} isError - Whether this is an error message
 */
function legacyLog(message, isError = false) {
  if (isError) {
    console.error(message);
    logger.error(message);
    // Try to log to Google Sheets, but don't wait for completion
    sheetLog(message, 'error').catch(() => {});
  } else {
    console.log(message);
    logger.info(message);
    // Try to log to Google Sheets, but don't wait for completion
    sheetLog(message, 'info').catch(() => {});
  }
}

// Create enhanced logger with methods that log to Google Sheets
const enhancedLogger = {
  info: (message, metadata) => enhancedLog('info', message, metadata),
  warn: (message, metadata) => enhancedLog('warn', message, metadata),
  error: (message, metadata) => enhancedLog('error', message, metadata),
  debug: (message, metadata) => enhancedLog('debug', message, metadata),
  // Include the legacy log method for backward compatibility
  log: legacyLog,
};

module.exports = {
  logger: enhancedLogger,
  legacyLog,
};