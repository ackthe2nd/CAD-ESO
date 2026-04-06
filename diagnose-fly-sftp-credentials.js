/**
 * Diagnose Fly.io SFTP Credentials Issue
 * Comprehensive analysis of authentication failure
 */

require('dotenv').config();

async function diagnoseFlyCredentials() {
  console.log('Diagnosing Fly.io SFTP Authentication Issue...\n');
  
  // Check current environment configuration
  const currentConfig = {
    host: process.env.SFTP_HOST,
    user: process.env.SFTP_USER,
    pass: process.env.SFTP_PASS,
    dir: process.env.SFTP_DIR,
    port: process.env.SFTP_PORT || 22
  };
  
  console.log('Current Environment Configuration:');
  console.log(`SFTP_HOST: ${currentConfig.host || 'MISSING'}`);
  console.log(`SFTP_USER: ${currentConfig.user || 'MISSING'}`);
  console.log(`SFTP_PASS: ${currentConfig.pass ? 'SET' : 'MISSING'}`);
  console.log(`SFTP_DIR: ${currentConfig.dir || 'MISSING'}`);
  console.log(`SFTP_PORT: ${currentConfig.port}`);
  
  // Identify missing credentials
  const missingCredentials = [];
  if (!currentConfig.host) missingCredentials.push('SFTP_HOST');
  if (!currentConfig.user) missingCredentials.push('SFTP_USER');
  if (!currentConfig.pass) missingCredentials.push('SFTP_PASS');
  if (!currentConfig.dir) missingCredentials.push('SFTP_DIR');
  
  if (missingCredentials.length > 0) {
    console.log('\n❌ Missing Required Credentials:');
    missingCredentials.forEach(cred => console.log(`- ${cred}`));
    
    console.log('\n🔧 Fix Commands for Fly.io:');
    console.log('flyctl secrets set SFTP_HOST="sftp.esosuite.net"');
    console.log('flyctl secrets set SFTP_USER="your_eso_username"');
    console.log('flyctl secrets set SFTP_PASS="your_eso_password"');
    console.log('flyctl secrets set SFTP_DIR="/your-eso-directory-path"');
    console.log('\nAfter setting secrets, redeploy:');
    console.log('flyctl deploy --app resgrid2eso');
    
    return false;
  }
  
  // Test actual SFTP connection
  console.log('\nTesting SFTP Connection with Current Credentials...');
  
  const FlyIoSftpClient = require('./src/fly-io-sftp-client');
  const client = new FlyIoSftpClient({
    host: currentConfig.host,
    port: currentConfig.port,
    username: currentConfig.user,
    password: currentConfig.pass
  });
  
  try {
    await client.connect();
    await client.disconnect();
    
    console.log('✅ SFTP Connection Successful');
    console.log('Authentication is working - issue may be in production environment');
    
    console.log('\n🔍 Production Debugging Steps:');
    console.log('1. Check Fly.io app secrets:');
    console.log('   flyctl secrets list --app resgrid2eso');
    console.log('2. Verify environment variables in deployment:');
    console.log('   flyctl ssh console --app resgrid2eso -C "env | grep SFTP"');
    console.log('3. Check application logs for credential errors:');
    console.log('   flyctl logs --app resgrid2eso | grep "authentication"');
    
    return true;
    
  } catch (error) {
    console.log('❌ SFTP Connection Failed');
    console.log(`Error: ${error.message}`);
    
    if (error.message.includes('authentication')) {
      console.log('\n🔐 Authentication Failure Analysis:');
      console.log('1. Username/password combination is incorrect');
      console.log('2. ESO account may be disabled or expired');
      console.log('3. SFTP access may not be enabled for your ESO account');
      console.log('4. Credentials may have special characters requiring escaping');
      
      console.log('\n📞 Contact ESO Support:');
      console.log('- Verify your SFTP account is active');
      console.log('- Confirm your username and password');
      console.log('- Request SFTP access if not enabled');
      console.log('- Check if your account has directory access permissions');
    }
    
    return false;
  }
}

diagnoseFlyCredentials().catch(console.error);