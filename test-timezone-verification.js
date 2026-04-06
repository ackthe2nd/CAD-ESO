/**
 * Test timezone conversion with current system data
 */

// Import the Pacific Time conversion function
const { convertToPacificTime } = require('./src/xml-generator-pacific-time');

function testCurrentTimezoneConversion() {
  console.log('=== Testing Current System Timezone Conversion ===\n');
  
  // Test cases based on the Resgrid data you showed
  const testCases = [
    '2025-06-07T15:48:11',      // From your Resgrid screenshot
    '2025-06-07T15:06:49',      // From your Resgrid screenshot  
    '2025-06-07T15:01:05',      // From your Resgrid screenshot
    '2025-06-07T22:06:49.12',   // UTC time that should convert to PDT
    '2025-06-07T15:01:05.833'   // UTC time with milliseconds
  ];
  
  console.log('Current time verification:');
  const now = new Date();
  console.log(`System UTC: ${now.toISOString()}`);
  console.log(`System Local: ${now.toString()}`);
  console.log('');
  
  testCases.forEach(timestamp => {
    try {
      const converted = convertToPacificTime(timestamp);
      const utcDate = new Date(timestamp);
      const convertedDate = new Date(converted);
      
      const offsetHours = utcDate.getUTCHours() - convertedDate.getHours();
      const isDST = offsetHours === 7; // PDT is UTC-7
      
      console.log(`Input:  ${timestamp}`);
      console.log(`Output: ${converted}`);
      console.log(`Offset: ${offsetHours} hours (${isDST ? 'PDT' : 'PST'})`);
      console.log('---');
    } catch (error) {
      console.log(`Error converting ${timestamp}: ${error.message}`);
      console.log('---');
    }
  });
}

testCurrentTimezoneConversion();