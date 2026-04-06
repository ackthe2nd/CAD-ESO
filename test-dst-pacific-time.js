/**
 * Test DST-aware Pacific Time Conversion
 * Verifies automatic switching between PST and PDT
 */

/**
 * Converts a timestamp to Pacific Time with automatic DST handling
 */
function convertToPacificTime(timestamp) {
  if (!timestamp || timestamp.trim() === '') {
    return '';
  }
  
  try {
    const date = new Date(timestamp);
    
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    
    // Convert to Pacific Time with automatic DST handling
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
    
    // Preserve milliseconds if they exist in original
    let milliseconds = '';
    if (timestamp.includes('.')) {
      const originalMs = timestamp.split('.')[1];
      if (originalMs) {
        const msMatch = originalMs.match(/^\d+/);
        if (msMatch) {
          milliseconds = '.' + msMatch[0];
        }
      }
    }
    
    const pacificTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    
    // Maintain original format with T separator if present
    if (timestamp.includes('T')) {
      return `${pacificTime.replace(' ', 'T')}${milliseconds}`;
    } else {
      return `${pacificTime}${milliseconds}`;
    }
  } catch (error) {
    return timestamp;
  }
}

/**
 * Test timezone conversion with various dates
 */
function testDSTConversion() {
  console.log('=== DST-Aware Pacific Time Conversion Test ===\n');
  
  // Test cases: UTC times during different DST periods
  const testCases = [
    // Winter (PST - UTC-8)
    { utc: '2025-01-15T22:06:49.12', expected: 'PST (UTC-8)', description: 'January - Standard Time' },
    { utc: '2025-02-10T15:30:25', expected: 'PST (UTC-8)', description: 'February - Standard Time' },
    
    // Spring transition (PDT starts 2nd Sunday in March)
    { utc: '2025-03-08T10:00:00', expected: 'PST (UTC-8)', description: 'Before DST transition' },
    { utc: '2025-03-10T10:00:00', expected: 'PDT (UTC-7)', description: 'After DST transition' },
    
    // Summer (PDT - UTC-7)
    { utc: '2025-06-07T22:06:49.12', expected: 'PDT (UTC-7)', description: 'June - Daylight Time' },
    { utc: '2025-07-15T15:01:05.833', expected: 'PDT (UTC-7)', description: 'July - Daylight Time' },
    { utc: '2025-08-20T14:30:00', expected: 'PDT (UTC-7)', description: 'August - Daylight Time' },
    
    // Fall transition (PST resumes 1st Sunday in November)
    { utc: '2025-11-01T08:00:00', expected: 'PDT (UTC-7)', description: 'Before PST transition' },
    { utc: '2025-11-03T08:00:00', expected: 'PST (UTC-8)', description: 'After PST transition' },
    
    // Winter again (PST - UTC-8)
    { utc: '2025-12-25T20:00:00', expected: 'PST (UTC-8)', description: 'December - Standard Time' }
  ];
  
  testCases.forEach(testCase => {
    const utcDate = new Date(testCase.utc);
    const pacificResult = convertToPacificTime(testCase.utc);
    const pacificDate = new Date(pacificResult);
    
    // Calculate actual offset
    const utcHours = utcDate.getUTCHours();
    const pacificHours = parseInt(pacificResult.split('T')[1] || pacificResult.split(' ')[1]);
    const actualOffset = utcHours - pacificHours;
    
    // Determine if DST is active
    const isDST = actualOffset === 7; // PDT is UTC-7, PST is UTC-8
    const offsetText = isDST ? 'PDT (UTC-7)' : 'PST (UTC-8)';
    const status = testCase.expected.includes(isDST ? 'PDT' : 'PST') ? '✅' : '❌';
    
    console.log(`${status} ${testCase.description}`);
    console.log(`   UTC: ${testCase.utc}`);
    console.log(`   Pacific: ${pacificResult}`);
    console.log(`   Offset: ${actualOffset} hours (${offsetText})`);
    console.log(`   Expected: ${testCase.expected}`);
    console.log('');
  });
  
  // Test current time conversion
  console.log('=== Current Time Test ===');
  const now = new Date();
  const nowUTC = now.toISOString();
  const nowPacific = convertToPacificTime(nowUTC);
  
  console.log(`Current UTC: ${nowUTC}`);
  console.log(`Current Pacific: ${nowPacific}`);
  
  // Verify it's currently PDT (June)
  const currentOffset = now.getUTCHours() - parseInt(nowPacific.split('T')[1]);
  const currentDST = currentOffset === 7;
  console.log(`Current offset: ${currentOffset} hours (${currentDST ? 'PDT' : 'PST'})`);
  console.log(`DST Active: ${currentDST ? 'Yes' : 'No'}`);
}

testDSTConversion();