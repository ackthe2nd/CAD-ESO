/**
 * Test script to verify the retry mechanisms
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { withRetry } = require('./src/retry-util');
const { getApiToken } = require('./src/token-manager');

// Simple logging
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  if (isError) {
    console.error(logMessage);
  }
}

// Mock function that fails a specified number of times before succeeding
async function mockFailingFunction(failCount) {
  let counter = 0;
  
  return withRetry(
    async () => {
      if (counter < failCount) {
        counter++;
        log(`Attempt ${counter}: Simulating failure...`);
        throw new Error(`Simulated error on attempt ${counter}`);
      }
      log(`Attempt ${counter + 1}: Success!`);
      return 'Success!';
    },
    {
      maxRetries: 5,
      initialDelay: 500,  // Short delay for testing
      maxDelay: 2000,
      exponential: true,
      operationName: 'Mock operation'
    }
  );
}

// Test retry with network-like errors
async function testNetworkErrors() {
  log('Testing retry mechanism with simulated network errors');
  
  try {
    const result = await mockFailingFunction(3);
    log(`✓ Successfully completed after retries: ${result}`);
  } catch (error) {
    log(`✗ Failed after retries: ${error.message}`, true);
  }
}

// Test retry on token retrieval (real-world test)
async function testTokenRetrieval() {
  log('Testing token retrieval with retry mechanism');
  
  try {
    const token = await getApiToken();
    if (token) {
      log(`✓ Successfully retrieved API token`);
    } else {
      log(`✗ Failed to retrieve API token`, true);
    }
  } catch (error) {
    log(`✗ Error during token retrieval: ${error.message}`, true);
  }
}

// Test retry with non-retryable errors
async function testNonRetryableErrors() {
  log('Testing retry mechanism with non-retryable errors');
  
  return withRetry(
    async () => {
      // Simulate a non-retryable error (like authentication)
      const nonRetryableError = new Error('Authentication failed: invalid credentials');
      nonRetryableError.code = 'AUTH_ERROR';
      throw nonRetryableError;
    },
    {
      maxRetries: 3,
      initialDelay: 500,
      operationName: 'Authentication test',
      shouldRetry: (error) => {
        // Don't retry authentication errors
        if (error.code === 'AUTH_ERROR' || 
            error.message.toLowerCase().includes('authentication') ||
            error.message.toLowerCase().includes('credentials')) {
          log('Not retrying due to authentication error');
          return false;
        }
        return true;
      }
    }
  ).catch(error => {
    log(`✓ Correctly did not retry: ${error.message}`);
    return 'Expected error';
  });
}

// Test writing to a file with retry
async function testFileWriteWithRetry() {
  log('Testing file write operation with retry mechanism');
  
  const testDir = './logs';
  const testFile = path.join(testDir, `retry-test-${Date.now()}.txt`);
  
  // Ensure logs directory exists
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  let writeAttempts = 0;
  
  return withRetry(
    async () => {
      writeAttempts++;
      
      // First two attempts will "fail"
      if (writeAttempts <= 2) {
        log(`Write attempt ${writeAttempts}: Simulating file system error...`);
        throw new Error(`Simulated file system error on attempt ${writeAttempts}`);
      }
      
      // Write the file on the third attempt
      fs.writeFileSync(testFile, `Successfully wrote file after ${writeAttempts} attempts\n`);
      log(`Write attempt ${writeAttempts}: Successfully wrote to ${testFile}`);
      return testFile;
    },
    {
      maxRetries: 4,
      initialDelay: 500,
      maxDelay: 2000,
      exponential: true,
      operationName: 'File write operation'
    }
  );
}

// Run all tests
async function runAllTests() {
  log('Starting retry mechanism tests');
  
  // Test 1: Network error simulation
  await testNetworkErrors();
  
  // Test 2: Token retrieval with retry (real API call)
  await testTokenRetrieval();
  
  // Test 3: Non-retryable errors
  await testNonRetryableErrors();
  
  // Test 4: File write with retry
  await testFileWriteWithRetry();
  
  log('All retry mechanism tests completed');
}

// Run the tests
runAllTests().catch(error => {
  log(`Error during tests: ${error.message}`, true);
});