const { processCallAdded } = require('./src/index');
require('dotenv').config();

/**
 * Test the CallAdded event handling with a sample call
 */
async function testCallAdded() {
  console.log('Testing CallAdded event handling...');
  
  // Create a sample call object that mimics what would come from Resgrid
  const sampleCall = {
    CallId: 'TEST-' + Date.now(),
    Timestamp: new Date().toISOString(),
    Nature: 'TEST CALL - Medical Emergency',
    Address: '123 Test Street, Test City, TX',
    Notes: 'This is a test call from the test script. Patient complaining of chest pain.'
  };
  
  console.log(`Created test call with ID: ${sampleCall.CallId}`);
  console.log('Call details:', JSON.stringify(sampleCall, null, 2));
  
  try {
    // Process the call as if it came from Resgrid
    await processCallAdded(sampleCall);
    console.log('Test completed successfully');
  } catch (error) {
    console.error(`Test failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

// Run the test
testCallAdded();