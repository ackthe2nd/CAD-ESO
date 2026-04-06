/**
 * Environment Validation for Resgrid-ESO Bridge
 * Validates required environment variables and configuration on startup
 */

// Simple logger for environment validation
const logger = {
  info: (message) => console.log(`[info]: ${message}`),
  error: (message) => console.error(`[error]: ${message}`),
  warn: (message) => console.warn(`[warn]: ${message}`)
};

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'RESGRID_USER',
  'RESGRID_PASS',
  'GOOGLE_SERVICE_ACCOUNT_JSON',
  'LOG_SHEET_ID'
];

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = {
  'POLLING_INTERVAL': '60000',
  'MAX_RETRIES': '3',
  'SFTP_TIMEOUT': '30000'
};

/**
 * Validates all required environment variables are present
 * @returns {Object} Validation result with success flag and details
 */
function validateEnvironment() {
  const results = {
    success: true,
    errors: [],
    warnings: [],
    summary: {}
  };

  // Check required variables
  for (const envVar of REQUIRED_ENV_VARS) {
    if (!process.env[envVar]) {
      results.success = false;
      results.errors.push(`Missing required environment variable: ${envVar}`);
    } else {
      results.summary[envVar] = 'Present';
    }
  }

  // Check optional variables and set defaults
  for (const [envVar, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
    if (!process.env[envVar]) {
      process.env[envVar] = defaultValue;
      results.warnings.push(`Using default value for ${envVar}: ${defaultValue}`);
      results.summary[envVar] = `Default: ${defaultValue}`;
    } else {
      results.summary[envVar] = 'Configured';
    }
  }

  // Validate Google Service Account JSON format
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      results.summary.GOOGLE_SERVICE_ACCOUNT_JSON = 'Valid JSON';
    } catch (error) {
      results.success = false;
      results.errors.push('GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON');
    }
  }

  return results;
}

/**
 * Validates the environment and exits if critical errors are found
 */
function validateAndExit() {
  console.log('🔍 Validating environment configuration...');
  
  const validation = validateEnvironment();
  
  if (validation.success) {
    console.log('✅ Environment validation passed');
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    logger.info('Environment validation completed successfully', {
      configuredVars: Object.keys(validation.summary).length,
      warnings: validation.warnings.length
    });
  } else {
    console.error('❌ Environment validation failed');
    console.error('\n🚫 Errors:');
    validation.errors.forEach(error => console.error(`   ${error}`));
    
    if (validation.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      validation.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.error('\nPlease set the required environment variables and restart the application.');
    process.exit(1);
  }
}

module.exports = {
  validateEnvironment,
  validateAndExit,
  REQUIRED_ENV_VARS,
  OPTIONAL_ENV_VARS
};