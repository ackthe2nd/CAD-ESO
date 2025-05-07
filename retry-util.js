/**
 * Utility for retry mechanisms
 */
const logger = require('./logger');

/**
 * Executes an async function with retry logic
 * 
 * @param {Function} fn - The async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms before first retry (default: 1000)
 * @param {number} options.maxDelay - Maximum delay between retries in ms (default: 30000)
 * @param {boolean} options.exponential - Whether to use exponential backoff (default: true)
 * @param {Function} options.shouldRetry - Function to determine if retry should be attempted (default: always retry)
 * @param {string} options.operationName - Name of the operation for logging (default: 'operation')
 * @returns {Promise<*>} - Result of the function call
 */
async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    exponential = true,
    shouldRetry = () => true,
    operationName = 'operation'
  } = options;

  let retryCount = 0;
  let lastError;

  while (retryCount <= maxRetries) {
    try {
      // If not the first attempt, log the retry
      if (retryCount > 0) {
        logger.info(`Retry attempt ${retryCount} of ${maxRetries} for ${operationName}`);
      }
      
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we should retry
      if (retryCount >= maxRetries || !shouldRetry(error)) {
        // We've reached max retries or shouldn't retry this error
        logger.error(`${operationName} failed after ${retryCount} retries: ${error.message}`, { error });
        throw error;
      }
      
      // Calculate delay before next retry
      let delay = initialDelay;
      if (exponential) {
        delay = Math.min(initialDelay * Math.pow(2, retryCount), maxDelay);
      }
      
      logger.warn(`${operationName} failed, retrying in ${delay}ms: ${error.message}`);
      
      // Wait before next retry
      await new Promise(resolve => setTimeout(resolve, delay));
      
      retryCount++;
    }
  }
  
  // This should not be reached due to the throw inside the loop,
  // but just in case, throw the last error
  throw lastError;
}

module.exports = { withRetry };