/**
 * Simple Connection Test - Quick SFTP validation
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');

async function quickConnectionTest() {
  console.log('Testing SFTP connection stability...\n');
  
  let successCount = 0;
  let failureCount = 0;
  const testCount = 5;
  
  for (let i = 1; i <= testCount; i++) {
    const sftp = new SftpClient();
    const startTime = Date.now();
    
    try {
      console.log(`Test ${i}: Connecting...`);
      
      // Wait between attempts to respect rate limiting
      if (i > 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      await sftp.connect({
        host: process.env.SFTP_HOST,
        port: parseInt(process.env.SFTP_PORT) || 22,
        username: process.env.SFTP_USER,
        password: process.env.SFTP_PASS,
        retries: 5,
        retry_factor: 3,
        retry_minTimeout: 5000,
        readyTimeout: 30000,
        timeout: 30000,
        forceIPv4: true
      });
      
      const connectionTime = Date.now() - startTime;
      console.log(`Test ${i}: SUCCESS (${connectionTime}ms)`);
      successCount++;
      
      // Quick upload test
      const testData = `<?xml version="1.0"?><test>${Date.now()}</test>`;
      const testFile = `${process.env.SFTP_DIR}/quick-test-${i}-${Date.now()}.xml`;
      await sftp.put(Buffer.from(testData), testFile);
      
      console.log(`Test ${i}: Upload successful\n`);
      
    } catch (error) {
      const errorTime = Date.now() - startTime;
      console.log(`Test ${i}: FAILED (${errorTime}ms) - ${error.message}\n`);
      failureCount++;
    }
    
    try {
      await sftp.end();
    } catch (closeError) {
      // Ignore close errors
    }
  }
  
  console.log('=== RESULTS ===');
  console.log(`Total tests: ${testCount}`);
  console.log(`Successful: ${successCount}`);
  console.log(`Failed: ${failureCount}`);
  console.log(`Success rate: ${(successCount/testCount*100).toFixed(1)}%`);
  
  if (successCount === testCount) {
    console.log('\n✅ All connections successful - SFTP is stable');
  } else if (successCount >= testCount * 0.8) {
    console.log('\n⚠️ Mostly successful - some intermittent issues');
  } else {
    console.log('\n❌ Significant connection problems detected');
  }
}

quickConnectionTest().catch(console.error);