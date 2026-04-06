/**
 * ESO Timestamp Correlation Analysis
 * Compares our system logs with ESO upload timestamps to ensure proper alignment
 */
require('dotenv').config();
const { google } = require('googleapis');

async function analyzeTimestampCorrelation() {
  try {
    console.log('=== ESO TIMESTAMP CORRELATION ANALYSIS ===');
    
    // ESO upload times from the provided log (assuming these are ESO's local time)
    const esoUploads = [
      { file: 'call_201572_1749802400704.xml', esoTime: '6/13/2025 3:13 AM', callId: '201572' },
      { file: 'call_201578_1749802609526.xml', esoTime: '6/13/2025 3:16 AM', callId: '201578' },
      { file: 'call_201576_1749802615300.xml', esoTime: '6/13/2025 3:16 AM', callId: '201576' },
      { file: 'call_201575_1749802619884.xml', esoTime: '6/13/2025 3:17 AM', callId: '201575' },
      { file: 'call_201573_1749802624456.xml', esoTime: '6/13/2025 3:17 AM', callId: '201573' },
      { file: 'call_201572_1749802628809.xml', esoTime: '6/13/2025 3:17 AM', callId: '201572' }, // Duplicate
      { file: 'call_201579_1749804144035.xml', esoTime: '6/13/2025 3:42 AM', callId: '201579' },
      { file: 'call_201579_1749804283780.xml', esoTime: '6/13/2025 3:44 AM', callId: '201579' }, // Duplicate
      { file: 'call_201579_1749804331730.xml', esoTime: '6/13/2025 3:45 AM', callId: '201579' }, // Duplicate
      { file: 'call_201579_1749804383183.xml', esoTime: '6/13/2025 3:46 AM', callId: '201579' }  // Duplicate
    ];
    
    // Convert filename timestamps to readable times
    console.log('\n=== ESO UPLOAD ANALYSIS ===');
    esoUploads.forEach(upload => {
      const timestamp = upload.file.match(/_(\d+)\.xml$/)[1];
      const systemTime = new Date(parseInt(timestamp));
      const pacificTime = systemTime.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        month: '2-digit',
        day: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
      
      console.log(`Call ${upload.callId}:`);
      console.log(`  ESO Time: ${upload.esoTime}`);
      console.log(`  Our System Time: ${pacificTime}`);
      console.log(`  Filename Timestamp: ${timestamp}`);
      console.log(`  UTC Time: ${systemTime.toISOString()}`);
      console.log('');
    });
    
    // Check for timezone offset patterns
    console.log('=== TIMEZONE ANALYSIS ===');
    
    // Parse ESO time and compare with our timestamp
    const testUpload = esoUploads[0];
    const timestamp = testUpload.file.match(/_(\d+)\.xml$/)[1];
    const ourSystemTime = new Date(parseInt(timestamp));
    
    // Parse ESO time (assuming format: "6/13/2025 3:13 AM")
    const esoTimeParts = testUpload.esoTime.match(/(\d+)\/(\d+)\/(\d+)\s+(\d+):(\d+)\s+(AM|PM)/);
    if (esoTimeParts) {
      const [, month, day, year, hour, minute, ampm] = esoTimeParts;
      let hour24 = parseInt(hour);
      if (ampm === 'PM' && hour24 !== 12) hour24 += 12;
      if (ampm === 'AM' && hour24 === 12) hour24 = 0;
      
      // Try different timezones for ESO
      const timezones = [
        'America/Los_Angeles', // Pacific
        'America/Denver',      // Mountain
        'America/Chicago',     // Central
        'America/New_York',    // Eastern
        'UTC'                  // UTC
      ];
      
      console.log('ESO time could be in one of these timezones:');
      timezones.forEach(tz => {
        const esoDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour24.toString().padStart(2, '0')}:${minute.padStart(2, '0')}:00`);
        const offsetMinutes = getTimezoneOffset(tz);
        const esoUTC = new Date(esoDate.getTime() - (offsetMinutes * 60000));
        const timeDiff = Math.abs(ourSystemTime.getTime() - esoUTC.getTime()) / (1000 * 60); // minutes
        
        console.log(`  ${tz}: ${esoUTC.toISOString()} (${timeDiff.toFixed(1)} min difference)`);
      });
    }
    
    // Analyze duplicate pattern
    console.log('\n=== DUPLICATE PROCESSING ANALYSIS ===');
    const duplicateCalls = {};
    esoUploads.forEach(upload => {
      if (!duplicateCalls[upload.callId]) {
        duplicateCalls[upload.callId] = [];
      }
      duplicateCalls[upload.callId].push(upload);
    });
    
    Object.entries(duplicateCalls).forEach(([callId, uploads]) => {
      if (uploads.length > 1) {
        console.log(`Call ${callId} was uploaded ${uploads.length} times:`);
        uploads.forEach((upload, index) => {
          console.log(`  ${index + 1}. ${upload.esoTime} - ${upload.file}`);
        });
        console.log('');
      }
    });
    
    console.log('=== RECOMMENDATIONS ===');
    console.log('1. Verify ESO timezone settings to ensure proper log correlation');
    console.log('2. Our duplicate processing fix should prevent multiple uploads');
    console.log('3. Monitor future uploads to confirm single upload per call');
    console.log('4. Consider adding timezone information to our logs for better correlation');
    
  } catch (error) {
    console.error('Error analyzing timestamp correlation:', error.message);
  }
}

function getTimezoneOffset(timezone) {
  const date = new Date();
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
  return (utcDate.getTime() - tzDate.getTime()) / (1000 * 60);
}

// Run the analysis
analyzeTimestampCorrelation();