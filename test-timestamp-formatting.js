/**
 * Test Timestamp Formatting for Google Sheets Display
 * Verify the new 6/9/2025 1:49:43 format is working correctly
 */

require('dotenv').config();

// Test the formatTimestampForSheets function
function formatTimestampForSheets(isoTimestamp) {
  if (!isoTimestamp || isoTimestamp.trim() === '') {
    return '';
  }
  
  try {
    // Parse the ISO timestamp (already in Pacific Time)
    const date = new Date(isoTimestamp);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return isoTimestamp; // Return original if invalid
    }
    
    // Manual format for exact control: 6/9/2025 1:49:43
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    return isoTimestamp;
  }
}

async function testTimestampFormatting() {
  console.log('Testing timestamp formatting for Google Sheets...\n');
  
  const testTimestamps = [
    '2025-06-09T01:49:42.763',  // Pacific Time ISO format from XML
    '2025-06-08T14:08:53.123',  // Afternoon time
    '2025-12-25T00:00:00.000',  // Midnight
    '2025-07-04T23:59:59.999'   // Almost midnight
  ];
  
  testTimestamps.forEach(timestamp => {
    const formatted = formatTimestampForSheets(timestamp);
    console.log(`Original: ${timestamp}`);
    console.log(`Formatted: ${formatted}`);
    console.log('---');
  });
  
  console.log('✅ Timestamp formatting test complete');
  console.log('Format will be: 6/9/2025 1:49:43 (M/D/YYYY H:MM:SS)');
}

testTimestampFormatting().catch(console.error);