/**
 * Diagnose SFTP Handshake Issue
 * 
 * This script performs comprehensive diagnostics for the "Connection lost before handshake" error
 * to identify the root cause and implement targeted fixes.
 */

require('dotenv').config();
const SftpClient = require('ssh2-sftp-client');
const net = require('net');
const dns = require('dns').promises;

const config = {
  host: process.env.SFTP_HOST || 'sftp.esosuite.net',
  port: parseInt(process.env.SFTP_PORT) || 22,
  username: process.env.SFTP_USER || 'CA-EMS',
  password: process.env.SFTP_PASS || 'EventMedicalPCR1!'
};

function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  if (isError) {
    console.error(`${timestamp} [ERROR]: ${message}`);
  } else {
    console.log(`${timestamp} [INFO]: ${message}`);
  }
}

/**
 * Test DNS resolution
 */
async function testDNSResolution() {
  log('=== DNS Resolution Test ===');
  try {
    const addresses = await dns.lookup(config.host, { all: true });
    log(`DNS Resolution successful for ${config.host}:`);
    addresses.forEach((addr, index) => {
      log(`  ${index + 1}. ${addr.address} (family: IPv${addr.family})`);
    });
    return true;
  } catch (error) {
    log(`DNS Resolution failed: ${error.message}`, true);
    return false;
  }
}

/**
 * Test raw TCP connection
 */
async function testTCPConnection() {
  log('=== TCP Connection Test ===');
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 15000;
    
    socket.setTimeout(timeout);
    
    socket.on('connect', () => {
      log(`TCP connection to ${config.host}:${config.port} successful`);
      socket.destroy();
      resolve(true);
    });
    
    socket.on('timeout', () => {
      log(`TCP connection timeout after ${timeout}ms`, true);
      socket.destroy();
      resolve(false);
    });
    
    socket.on('error', (error) => {
      log(`TCP connection error: ${error.message}`, true);
      socket.destroy();
      resolve(false);
    });
    
    log(`Attempting TCP connection to ${config.host}:${config.port}...`);
    socket.connect(config.port, config.host);
  });
}

/**
 * Test SFTP connection with minimal configuration
 */
async function testMinimalSFTPConnection() {
  log('=== Minimal SFTP Connection Test ===');
  const sftp = new SftpClient();
  
  try {
    log('Attempting minimal SFTP connection...');
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 20000,
      timeout: 20000
    });
    
    log('Minimal SFTP connection successful');
    await sftp.end();
    return true;
  } catch (error) {
    log(`Minimal SFTP connection failed: ${error.message}`, true);
    try {
      await sftp.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Test SFTP connection with conservative configuration
 */
async function testConservativeSFTPConnection() {
  log('=== Conservative SFTP Connection Test ===');
  const sftp = new SftpClient();
  
  try {
    log('Attempting conservative SFTP connection...');
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 60000,
      timeout: 60000,
      forceIPv4: true,
      retries: 1,
      retry_factor: 1,
      retry_minTimeout: 1000,
      debug: false
    });
    
    log('Conservative SFTP connection successful');
    await sftp.end();
    return true;
  } catch (error) {
    log(`Conservative SFTP connection failed: ${error.message}`, true);
    try {
      await sftp.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Test SFTP connection with algorithm restrictions
 */
async function testRestrictedAlgorithmsSFTPConnection() {
  log('=== Restricted Algorithms SFTP Connection Test ===');
  const sftp = new SftpClient();
  
  try {
    log('Attempting SFTP connection with restricted algorithms...');
    await sftp.connect({
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      readyTimeout: 45000,
      timeout: 45000,
      forceIPv4: true,
      algorithms: {
        kex: ['diffie-hellman-group14-sha1'],
        cipher: ['aes128-ctr'],
        hmac: ['hmac-sha1'],
        compress: ['none']
      }
    });
    
    log('Restricted algorithms SFTP connection successful');
    await sftp.end();
    return true;
  } catch (error) {
    log(`Restricted algorithms SFTP connection failed: ${error.message}`, true);
    try {
      await sftp.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

/**
 * Test connection with progressive delays
 */
async function testProgressiveDelaySFTPConnection() {
  log('=== Progressive Delay SFTP Connection Test ===');
  
  for (let delay of [0, 1000, 3000, 5000, 10000]) {
    log(`Testing with ${delay}ms delay...`);
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    const sftp = new SftpClient();
    try {
      await sftp.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        readyTimeout: 30000,
        timeout: 30000,
        forceIPv4: true
      });
      
      log(`Progressive delay SFTP connection successful with ${delay}ms delay`);
      await sftp.end();
      return { success: true, optimalDelay: delay };
    } catch (error) {
      log(`Progressive delay failed with ${delay}ms: ${error.message}`, true);
      try {
        await sftp.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }
  
  return { success: false, optimalDelay: null };
}

/**
 * Run comprehensive diagnostics
 */
async function runDiagnostics() {
  log('Starting comprehensive SFTP handshake diagnostics...');
  log(`Target: ${config.host}:${config.port} with user: ${config.username}`);
  
  const results = {
    dns: false,
    tcp: false,
    minimalSftp: false,
    conservativeSftp: false,
    restrictedAlgorithms: false,
    progressiveDelay: { success: false, optimalDelay: null }
  };
  
  // Test 1: DNS Resolution
  results.dns = await testDNSResolution();
  
  // Test 2: TCP Connection
  if (results.dns) {
    results.tcp = await testTCPConnection();
  }
  
  // Test 3: Minimal SFTP Connection
  if (results.tcp) {
    results.minimalSftp = await testMinimalSFTPConnection();
  }
  
  // Test 4: Conservative SFTP Connection
  if (!results.minimalSftp) {
    results.conservativeSftp = await testConservativeSFTPConnection();
  }
  
  // Test 5: Restricted Algorithms
  if (!results.minimalSftp && !results.conservativeSftp) {
    results.restrictedAlgorithms = await testRestrictedAlgorithmsSFTPConnection();
  }
  
  // Test 6: Progressive Delay Testing
  if (!results.minimalSftp && !results.conservativeSftp && !results.restrictedAlgorithms) {
    results.progressiveDelay = await testProgressiveDelaySFTPConnection();
  }
  
  // Generate recommendations
  log('\n=== DIAGNOSTIC RESULTS ===');
  log(`DNS Resolution: ${results.dns ? 'PASS' : 'FAIL'}`);
  log(`TCP Connection: ${results.tcp ? 'PASS' : 'FAIL'}`);
  log(`Minimal SFTP: ${results.minimalSftp ? 'PASS' : 'FAIL'}`);
  log(`Conservative SFTP: ${results.conservativeSftp ? 'PASS' : 'FAIL'}`);
  log(`Restricted Algorithms: ${results.restrictedAlgorithms ? 'PASS' : 'FAIL'}`);
  log(`Progressive Delay: ${results.progressiveDelay.success ? 'PASS' : 'FAIL'}`);
  
  if (results.progressiveDelay.success && results.progressiveDelay.optimalDelay !== null) {
    log(`Optimal delay found: ${results.progressiveDelay.optimalDelay}ms`);
  }
  
  log('\n=== RECOMMENDATIONS ===');
  
  if (!results.dns) {
    log('❌ DNS resolution failed - check network connectivity and DNS settings');
  } else if (!results.tcp) {
    log('❌ TCP connection failed - possible firewall or network routing issue');
  } else if (results.minimalSftp) {
    log('✅ Minimal SFTP works - use simplified connection configuration');
  } else if (results.conservativeSftp) {
    log('✅ Conservative SFTP works - increase timeouts and use IPv4 only');
  } else if (results.restrictedAlgorithms) {
    log('✅ Restricted algorithms work - use legacy SSH algorithms');
  } else if (results.progressiveDelay.success) {
    log(`✅ Progressive delay works - add ${results.progressiveDelay.optimalDelay}ms delay before connections`);
  } else {
    log('❌ All connection methods failed - contact ESO support for server status');
    log('Possible causes:');
    log('  - ESO server temporarily unavailable');
    log('  - IP address blocked due to too many connection attempts');
    log('  - Network infrastructure blocking SSH/SFTP traffic');
    log('  - ESO server configuration changes');
  }
  
  return results;
}

// Run diagnostics
runDiagnostics().catch(error => {
  log(`Diagnostic script failed: ${error.message}`, true);
  process.exit(1);
});