/**
 * Check Current System Logs for Call 201237 Dispatch Times
 * Extract the original timestamps from the system processing logs
 */

const fs = require('fs');

function analyzeLogData() {
  console.log('ANALYZING CALL 201237 DISPATCH TIMES FROM SYSTEM LOGS');
  console.log('====================================================');
  
  // Based on the logs we've seen, let's trace the dispatch time conversion
  console.log('\nFrom the system logs, we can see:');
  console.log('1. LoggedOn: 2025-06-09T01:49:42.763 (Pacific Time)');
  console.log('2. LoggedOnUtc: 2025-06-09T08:49:42.763 (UTC)');
  console.log('');
  
  // The issue analysis
  console.log('TIMESTAMP CONVERSION ANALYSIS:');
  console.log('=============================');
  
  // UTC to Pacific conversion test
  function convertToPacificTime(timestamp) {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      const pacificFormatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Los_Angeles',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });
      
      const pacificParts = pacificFormatter.formatToParts(date);
      const year = pacificParts.find(part => part.type === 'year').value;
      const month = pacificParts.find(part => part.type === 'month').value;
      const day = pacificParts.find(part => part.type === 'day').value;
      const hours = pacificParts.find(part => part.type === 'hour').value;
      const minutes = pacificParts.find(part => part.type === 'minute').value;
      const seconds = pacificParts.find(part => part.type === 'second').value;
      
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
    } catch (error) {
      return timestamp;
    }
  }
  
  // Test conversions
  const utcTime = '2025-06-09T08:49:42.763';
  const pacificResult = convertToPacificTime(utcTime);
  
  console.log('Original UTC Time:', utcTime);
  console.log('Converted to Pacific:', pacificResult);
  console.log('');
  
  // Check if the Google Sheets is showing the wrong conversion
  const wrongTime = '2025-06-08 18:49:42';
  console.log('Google Sheets showing:', wrongTime);
  console.log('Expected Pacific Time:', pacificResult);
  console.log('');
  
  // Test the wrong time conversion
  const wrongTimeTest = convertToPacificTime('2025-06-08T18:49:42');
  console.log('If we convert the wrong time to Pacific:', wrongTimeTest);
  
  // Analysis
  console.log('\nANALYSIS:');
  console.log('=========');
  console.log('The XML shows correct Pacific Time: 2025-06-09T01:49:42.763');
  console.log('Google Sheets shows: 2025-06-08 18:49:42');
  console.log('');
  console.log('This suggests the Google Sheets extraction is using an incorrect source timestamp');
  console.log('or the conversion is applying Pacific Time conversion to an already-Pacific timestamp.');
  console.log('');
  console.log('SOLUTION: The Unit Dispatched Times should match the XML UnitNotifiedByDispatch times:');
  console.log('Expected: 2025-06-09T01:49:42.763');
  console.log('Current:  2025-06-08 18:49:42');
}

analyzeLogData();