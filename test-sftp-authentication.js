/**
 * Test SFTP Authentication
 * Verify SFTP credentials and connection
 */

require('dotenv').config();

async function testSftpAuthentication() {
  console.log('Testing SFTP Authentication Configuration...\n');
  
  // Check environment variables
  console.log('Environment Variables:');
  console.log(`SFTP_HOST: ${process.env.SFTP_HOST || 'NOT SET'}`);
  console.log(`SFTP_USER: ${process.env.SFTP_USER || 'NOT SET'}`);
  console.log(`SFTP_PASS: ${process.env.SFTP_PASS ? 'SET (hidden)' : 'NOT SET'}`);
  console.log(`SFTP_DIR: ${process.env.SFTP_DIR || 'NOT SET'}`);
  
  if (!process.env.SFTP_USER || !process.env.SFTP_PASS) {
    console.log('\n❌ SFTP Authentication Failed: Missing Credentials');
    console.log('\nRequired Environment Variables:');
    console.log('SFTP_HOST=sftp.esosuite.net');
    console.log('SFTP_USER=your_eso_username');
    console.log('SFTP_PASS=your_eso_password');
    console.log('SFTP_DIR=/your-eso-directory-path');
    console.log('\nPlease set these in your Fly.io secrets:');
    console.log('flyctl secrets set SFTP_USER="your_username"');
    console.log('flyctl secrets set SFTP_PASS="your_password"');
    return false;
  }
  
  // Test connection with current credentials
  const FlyIoSftpClient = require('./src/fly-io-sftp-client');
  
  const sftpConfig = {
    host: process.env.SFTP_HOST,
    port: process.env.SFTP_PORT || 22,
    username: process.env.SFTP_USER,
    password: process.env.SFTP_PASS
  };
  
  console.log('\nTesting SFTP Connection...');
  console.log(`Host: ${sftpConfig.host}`);
  console.log(`Port: ${sftpConfig.port}`);
  console.log(`Username: ${sftpConfig.username}`);
  
  const client = new FlyIoSftpClient(sftpConfig);
  
  try {
    const success = await client.testConnection();
    
    if (success) {
      console.log('\n✅ SFTP Authentication Successful');
      console.log('Connection established - credentials are valid');
      return true;
    } else {
      console.log('\n❌ SFTP Authentication Failed');
      console.log('Connection failed - check credentials');
      return false;
    }
    
  } catch (error) {
    console.log('\n❌ SFTP Authentication Error:');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('authentication')) {
      console.log('\nAuthentication Issues:');
      console.log('1. Verify SFTP username is correct');
      console.log('2. Verify SFTP password is correct');
      console.log('3. Check if ESO account is active');
      console.log('4. Confirm SFTP access is enabled for your account');
    }
    
    return false;
  }
}

testSftpAuthentication().catch(console.error);